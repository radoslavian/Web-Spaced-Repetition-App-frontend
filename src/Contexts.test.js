import { render, act, waitFor, screen, within,
         fireEvent } from "@testing-library/react";
import { useRef, useEffect } from "react";
import axios, { axiosMatch, categoriesCalls } from "axios";
import { UserProvider, useUser } from "./contexts/UserProvider";
import { ApiProvider, useApi } from "./contexts/ApiProvider";
import { timeOut } from "./utils/helpers";
import { CategoriesProvider,
         useCategories } from "./contexts/CategoriesProvider";
import { CardsProvider, useCards } from "./contexts/CardsProvider.js";
import CategorySelector from "./components/CategorySelector.js";
import { memorizedCardsSecondPage, memorizedCard,
         queuedCardsMiddlePage } from "./__mocks__/mockData";

describe("<ApiProvider/>", () => {
    function FakeComponent() {
        const api = useApi();
        const credentials = {user: "user1",
                             password: "passwd"};
        api.authenticate("/auth/token/login/", credentials);
        return (<></>);
    }

    beforeAll(() => {
        render(
            <ApiProvider>
              <FakeComponent/>
            </ApiProvider>
        );
    });

    test("calling authentication route", () => {
        const loginRoute = "http://localhost:8000/api/auth/token/login/";
        expect(axiosMatch.post).toHaveBeenCalledTimes(1);
        expect(axiosMatch.post).toHaveBeenCalledWith(
            {"data":
             {"password": "passwd", "user": "user1"},
             "headers": {"Content-Type": "application/json"},
             "method": "post",
             "url": "http://localhost:8000/api/auth/token/login/"});
    });
});

describe("<UserProvider/>", () => {
    const TestingComponent = () => {
        const api = useApi();
        const credentials = {user: "user1",
                             password: "passwd"};
        api.authenticate("/auth/token/login/", credentials);
        const { user } = useUser();
        return (
            <div>
              <p>{ user?.email }</p>
              <p>{ user?.id }</p>
              <p>{ user?.username }</p>
            </div>
        );
    };

    beforeEach(async () => {
        await act(async () => render(
            <ApiProvider>
              <UserProvider>
                <TestingComponent/>
              </UserProvider>
            </ApiProvider>
        ));
    });

    afterAll(jest.clearAllMocks);

    test("if the component returned user email from the provider", () => {
        const userData = {
            email: "user@userdomain.com.su",
            id: "626e4d32-a52f-4c15-8f78-aacf3b69a9b2",
            username: "django_root"
        };
        const userEmail = screen.getByText("user@userdomain.com.su");
        expect(userEmail).toBeInTheDocument();
    });

    test("if the component returned user id from the provider", () => {
        const userId = screen.getByText(
            "626e4d32-a52f-4c15-8f78-aacf3b69a9b2");
        expect(userId).toBeInTheDocument();
    });

    test("if the component returned username from the provider", () => {
        const userName = screen.getByText("user_name");
        waitFor(() => expect(userName).toBeInTheDocument());
    });
});

describe("<CategoriesProvider/>", () => {
    const TestingComponent = () => {
        const api = useApi();
        const credentials = {user: "user1",
                             password: "passwd"};
        const { categories, selectedCategories,
                setSelectedCategories } = useCategories();
        const called = useRef(false);

        if (!called.current) {
            (async () => {
                await api.authenticate("/auth/token/login/", credentials);
                await timeOut(10);
                setSelectedCategories(
                    ["6d18daff-94d1-489b-97ce-969d1c2912a6"]);
                if (categories != []) {
                    called.current = true;
                }
            })();
        }

        return(<>
                 <div data-testid="test-component-categories">
                   { JSON.stringify(categories) }
                 </div>
                 <div data-testid="test-component-selected-categories">
                   { JSON.stringify(selectedCategories) }
                 </div>
               </>);
    };

    beforeEach(async () => await act(async () => render(
        <ApiProvider>
          <UserProvider>
            <CategoriesProvider>
              <TestingComponent/>
            </CategoriesProvider>
          </UserProvider>
        </ApiProvider>
    )));

    afterAll(jest.clearAllMocks);

    test("if route for downloading categories has been called", () => {
        const route = "http://localhost:8000/api/users/"
              + "626e4d32-a52f-4c15-8f78-aacf3b69a9b2/categories/";
        const options = {"headers":
                         {"Authorization":
                          "Token 7f3371589a52d0ef17877c61d1c82cdf9b7d8f3f",
                          "Content-Type": "application/json"},
                         "method": "get",
                         "url": "http://localhost:8000/api/users/626e4d32-a5"
                         + "2f-4c15-8f78-aacf3b69a9b2/categories/"};

        expect(categoriesCalls).toHaveBeenCalledTimes(1);
        expect(categoriesCalls).toHaveBeenCalledWith(options);
    });

    test("if provider returns categories", () => {
        const testedComponent = screen.getByTestId("test-component-categories");
        // arbitrary key - from category "Noun"
        const categoryKey = "506112ea-af69-436e-af1b-64475de40992";
        // arbitrary category title
        const categoryTitle = "Household devices";

        expect(testedComponent).toHaveTextContent(categoryKey);
        expect(testedComponent).toHaveTextContent(categoryTitle);
    });

    test("if provider returns user-selected categories", () => {
        const testedComponent = screen.getByTestId(
            "test-component-selected-categories");
        const categoryKey = "64c3df14-7117-4453-8679-42ebfd18159c";

        expect(testedComponent).toHaveTextContent(categoryKey);
    });

    test("if categories setter called the api", async () => {
        // cumulative number of all api calls in current "describe" block
        await waitFor(() => expect(axiosMatch.put).toHaveBeenCalledTimes(8));
    });
});

function getProviderGeneralTestingComponent (cardsGroup) {
    return () => {
        const { currentPage, count, isFirst, isLast } = cardsGroup;

        return (
            <>
              <span data-testid="is-first">
                { isFirst ? "true" : "false" }
              </span>
              <span data-testid="is-last">
                { isLast ? "true" : "false"}
              </span>
              <span data-testid="count">{ count }</span>
              <CardsCurrentPage
                data-testid="current-page"
                currentPage={currentPage}/>
            </>
        );
    };
}

function getComponentWithProviders(Component) {
    return () => (<ApiProvider>
                    <UserProvider>
                      <CategoriesProvider>
                        <CardsProvider>
                          <Component/>
                        </CardsProvider>
                      </CategoriesProvider>
                    </UserProvider>
                  </ApiProvider>
                 );
}

describe("<CardsProvider/> - memorized (general)", () => {
    const TestingComponent = () => getProviderGeneralTestingComponent(
        useCards().memorized)();
    const ComponentWithProviders = getComponentWithProviders(TestingComponent);
    const card = memorizedCardsSecondPage.results[0];

    // should be: beforeAll, but gets reset to <body/>
    // after each test
    beforeEach(async () => await act(() => render(
        <ComponentWithProviders/>)));

    test("if currentPage returned expected output", () => {
        const receivedCard = screen.getByTestId(card.id);
        expect(receivedCard).toBeInTheDocument();
    });

    test("if count shows expected number of memorized cards", () => {
        const receivedCard = screen.getByTestId("count");
        expect(receivedCard).toHaveTextContent("62");
    });

    test("if isFirst correctly indicates we're not on the first page", () => {
        const isFirst = screen.getByTestId("is-first");
        expect(isFirst).toHaveTextContent("false");
    });

    test("if isLast correctly indicates we are not on the last page", () => {
        const isLast = screen.getByTestId("is-last");
        expect(isLast).toHaveTextContent("false");
    });
});

function getNavigationTestingComponent(cardsGroup) {
    return () => {
        const { currentPage, prevPage, nextPage, loadMore, goToFirst,
                isFirst, isLast } = cardsGroup;

        return (
            <>
              <div data-testid="isFirst">
                { isFirst ? "true" : "false" }
              </div>
              <div data-testid="isLast">
                { isLast ? "true" : "false" }
              </div>
              { currentPage !== [] ? <>
                                       <div data-testid="click_prevPage"
                                             onClick={prevPage}>
                                         Click for previous page
                                       </div>
                                       <div data-testid="click_nextPage"
                                             onClick={nextPage}>
                                         Click for next page
                                       </div>
                                       <div data-testid="load-more"
                                            onClick={loadMore}>
                                         Click to load more
                                       </div>
                                       <div data-testid="go-to-first"
                                            onClick={goToFirst}>
                                         Go to first page (reset)
                                       </div>
                                     </>
                
                : "" }
              <div data-testid="page-data">
                { currentPage.map(card => (
                    <p key={card.id} data-testid={card.id}></p>
                )) }
              </div>
            </>
        );
    };
}

describe("<CardsProvider/> - memorized: navigation", () => {
    afterAll(jest.clearAllMocks);

    const TestingComponent = () => getNavigationTestingComponent(
        useCards().memorized)();
    const ComponentWithProviders = getComponentWithProviders(
        TestingComponent);

    test("rendering next page", async () => {
        await act(() => render(
            <ComponentWithProviders/>
        ));
        const clickNext = await screen.findByTestId("click_nextPage");
        fireEvent.click(clickNext);
        
        const card = await screen.findByTestId(
            "b9f2a0ec-fac1-4574-a553-26c5e8d8b5ab");
        expect(card).toBeInTheDocument();
    });

    test("rendering previous page", async () => {
        await act(() => render(
            <ComponentWithProviders/>
        ));
        const clickPrev = await screen.findByTestId("click_prevPage");
        fireEvent.click(clickPrev);
        const card = await screen.findByTestId(
            "3dc52454-4931-4583-9737-81e6a56ac127");
        expect(card).toBeInTheDocument();
    });
});

// move that to the top
const CardsCurrentPage = ({ currentPage }) => (
    <>
      { currentPage.map(card => (
          <p key={ card.id }
             data-testid={ card.id }>
          </p>
      )) }
    </>
);

describe("<CardsProvider/> - queued (general)", () => {
    const TestingComponent = () => getProviderGeneralTestingComponent(
        useCards().queued)();
    const card = queuedCardsMiddlePage.results[0];
    const ComponentWithProviders = getComponentWithProviders(
        TestingComponent);

    // should be: beforeAll instead, but gets reset to <body/>
    // after each test
    beforeEach(async () => await act(() => render(
        <ComponentWithProviders/>)));

    test("if currentPage returned expected output", () => {
        const receivedCard = screen.getByTestId(card.id);
        expect(receivedCard).toBeInTheDocument();
    });

    test("if count shows expected number of queued cards", () => {
        const receivedCard = screen.getByTestId("count");
        expect(receivedCard).toHaveTextContent("60");
    });

    test("if isFirst correctly indicates we're not on the first page", () => {
        const isFirst = screen.getByTestId("is-first");
        expect(isFirst).toHaveTextContent("false");
    });

    test("if isLast correctly indicates we are not on the last page", () => {
        const isLast = screen.getByTestId("is-last");
        expect(isLast).toHaveTextContent("false");
    });
});

describe("<CardsProvider/> - queued: navigation", () => {
    afterAll(jest.clearAllMocks);

    const QueuedTestingComponent = () => getNavigationTestingComponent(
        useCards().queued)();
    const ComponentWithProviders = getComponentWithProviders(
        QueuedTestingComponent);

    beforeEach(async () => await act(() => render(
            <ComponentWithProviders/>
        )));

    test("rendering next page", async () => {
        const clickNext = await screen.findByTestId("click_nextPage");
        fireEvent.click(clickNext);
        const card = await screen.findByTestId(
            "5cd3446f-0b68-4224-8bb8-f04fe4ed83cb");
        expect(card).toBeInTheDocument();
    });

    test("rendering previous page", async () => {
        const clickPrev = await screen.findByTestId("click_prevPage");
        fireEvent.click(clickPrev);
        const card = await screen.findByTestId(
            "f4055d8c-c97f-419f-b6db-61d36f53da47");
        expect(card).toBeInTheDocument();
    });

    test("isFirst should be false", async () => {
        const isFirstValue = await screen.findByTestId("isFirst");
        expect(isFirstValue).toHaveTextContent("false");
    });

    test("isFirst should be true", async () => {
        const clickPrev = await screen.findByTestId("click_prevPage");
        fireEvent.click(clickPrev);
        const isFirstValue = await screen.findByTestId("isFirst");
        await waitFor(() => expect(isFirstValue).toHaveTextContent("true"));
    });

    test("isLast should be false", async () => {
        const isLastValue = await screen.findByTestId("isLast");
        await waitFor(() => expect(isLastValue).toHaveTextContent("false"));
    });

    test("isLast should be true", async () => {
        const clickNext = await screen.findByTestId("click_nextPage");
        fireEvent.click(clickNext);
        const isLastValue = await screen.findByTestId("isLast");
        await waitFor(() => expect(isLastValue).toHaveTextContent("true"));
    });
});

describe("<CardsProvider/> - outstanding (scheduled) - general", () => {
    const TestingComponent = () => getProviderGeneralTestingComponent(
        useCards().outstanding)();
    const ComponentWithProviders = getComponentWithProviders(
        TestingComponent);

    beforeEach(async () => await act(() => render(
        <ComponentWithProviders/>)));

    test("if currentPage returned expected output", () => {
        const receivedCard = screen.getByTestId(
            "7cf7ed26-bfd2-45a8-a9fc-a284a86a6bfa");
        expect(receivedCard).toBeInTheDocument();
    });

    test("if count shows expected number of outstanding cards", () => {
        const receivedCard = screen.getByTestId("count");
        expect(receivedCard).toHaveTextContent("3");
    });

    test("if isFirst correctly indicates we're not on the first page", () => {
        const isFirst = screen.getByTestId("is-first");
        expect(isFirst).toHaveTextContent("false");
    });

    test("if isLast correctly indicates we are not on the last page", () => {
        const isLast = screen.getByTestId("is-last");
        expect(isLast).toHaveTextContent("false");
    });
});

describe("<CardsProvider/> - outstanding (scheduled) - navigation", () => {
    const QueuedTestingComponent = () => getNavigationTestingComponent(
        useCards().outstanding)();
    const ComponentWithProviders = getComponentWithProviders(
        QueuedTestingComponent);

    beforeEach(async () => await act(() => render(
            <ComponentWithProviders/>
        )));

    test("rendering next page", async () => {
        const clickNext = await screen.findByTestId("click_nextPage");
        fireEvent.click(clickNext);
        const card = await screen.findByTestId(
            "c6168ba7-6eac-4e1c-806b-3ce111bcdec3");
        expect(card).toBeInTheDocument();
    });

    test("rendering previous page", async () => {
        const clickPrev = await screen.findByTestId("click_prevPage");
        fireEvent.click(clickPrev);
        const card = await screen.findByTestId(
            "91d1ef25-b1c8-4c49-8b00-215f90088232");
        expect(card).toBeInTheDocument();
    });
});

describe("<CardsProvider/> - all cards - general", () => {
    const TestingComponent = () => getProviderGeneralTestingComponent(
        useCards().all)();
    const ComponentWithProviders = getComponentWithProviders(
        TestingComponent);

    beforeEach(async () => await act(() => render(
        <ComponentWithProviders/>)));

    test("if currentPage returned expected output", () => {
        // data: allCardsMiddle
        const receivedCard = screen.getByTestId(
            "f8f3ef31-1554-450f-ad7b-589bfd0e068d");  // memorized
        expect(receivedCard).toBeInTheDocument();
    });

    test("if count shows expected number of outstanding cards", () => {
        const receivedCard = screen.getByTestId("count");
        expect(receivedCard).toHaveTextContent("122");
    });

    test("if isFirst correctly indicates we're not on the first page",
         async () => {
             const isFirst = await screen.findByTestId("is-first");
             expect(isFirst).toHaveTextContent("false");
    });

    test("if isLast correctly indicates we are not on the last page",
         () => {
             const isLast = screen.getByTestId("is-last");
             expect(isLast).toHaveTextContent("false");
    });
});

describe("<CardsProvider/> - all cards - navigation", () => {
    const QueuedTestingComponent = () => getNavigationTestingComponent(
        useCards().all)();
    const ComponentWithProviders = getComponentWithProviders(
        QueuedTestingComponent);

    beforeEach(async () => await act(() => render(
            <ComponentWithProviders/>
        )));

    test("rendering next page", async () => {
        const clickNext = await screen.findByTestId("click_nextPage");
        fireEvent.click(clickNext);
        const card = await screen.findByTestId(
            "f4055d8c-c97f-419f-b6db-62d36f53da47");
        expect(card).toBeInTheDocument();
    });

    test("rendering previous page", async () => {
        const clickPrev = await screen.findByTestId("click_prevPage");
        fireEvent.click(clickPrev);
        const card = await screen.findByTestId(
            "5cd3446f-0b68-4224-8bb8-f04fe4ed83cb");
        expect(card).toBeInTheDocument();
    });

    test("load more", async () => {
        // currentPage, after hitting loadMore, shows items from the first
        // and second page
        const loadMore = await screen.findByTestId("load-more");
        fireEvent.click(loadMore);
        const cardMiddle = await screen.findByTestId(
            "f8f3ef31-1554-450f-ad7b-589bfd0e068d");  // allCardsMiddle
        const cardNext = await screen.findByTestId(
            "7cf7ed26-bfd2-45a8-a9fc-a284a86a6bfa");  // allCardsNext

        // assert cards from the first and 2nd page
        expect(cardMiddle).toBeInTheDocument();
        expect(cardNext).toBeInTheDocument();
    });

    test("goToFirst - reseting and returning to the first page", async () => {
        const loadMore = await screen.findByTestId("load-more");
        const goToFirst = await screen.findByTestId("go-to-first");
        fireEvent.click(loadMore);
        fireEvent.click(goToFirst);

        // StackOverflow recipe:
        // https://stackoverflow.com/questions/68400489/how-to-wait-to-assert
        // -an-element-never-appears-in-the-document
        await expect(async () => {
            await waitFor(
                () => expect(screen.getByTestId(
                    "7cf7ed26-bfd2-45a8-a9fc-a284a86a6bfa"))
                    .toBeInTheDocument()
            );
        }).rejects.toEqual(expect.anything());        
    });
});

describe("<CardsProvider/> - functions (memorize, forget, cram)", () => {
    function FunctionsTestingComponent() {
        const { memorize } = useCards().functions;
        const grade = 2;

        return (
            <span onClick={ () => memorize(memorizedCard, grade) }
                  data-testid="click-memorize-card">
              Click to memorize card
            </span>
        );
    }
    
    const ComponentWithProviders = getComponentWithProviders(
        FunctionsTestingComponent);
    beforeEach(async () => await act(() => render(
            <ComponentWithProviders/>
        )));

    test("memorizing queued card", async () => {
        const memorize = await screen.findByTestId("click-memorize-card");
        const expectedUrl = "http://localhost:8000/api/users/626e4d32-a5"
              + "2f-4c15-8f78-aacf3b69a9b2/cards/queued/a0a5e0bb-d17a"
              + "-4f1a-9945-ecb0bc5fc4ad";
        const expectedGrade = 2;

        fireEvent.click(memorize);
        await waitFor(() => expect(
            axiosMatch.patch).toHaveBeenCalledTimes(1));
        const mockCalls = axiosMatch.patch.mock.calls[0][0];
        expect(mockCalls.url).toEqual(expectedUrl);
        expect(mockCalls.data.grade).toEqual(expectedGrade);
    });
});


