import { Space } from "antd";
import { useCards } from "../contexts/CardsProvider";
import CardsReviewer from "./CardsReviewer";
import LearningProgress from "./LearningProgress";
import MainDisplay from "./MainDisplay";
import { useState, useEffect } from "react";
import { Button, Row, Col } from "antd"; 

function getChecker(obj) {
    return () => {
        // debug
        /*
          console.log(`Obj: isLast: ${obj.cardsList.isLast},
          currentPage.length: ${obj.cardsList.currentPage.length},
          isLoading: ${obj.cardsList.isLoading}`);
        */
        return (obj.cardsList.isLast === false
                && obj.cardsList.currentPage.length === 0
                && !obj.cardsList.isLoading);
    };
};

const cardsLists = {
    scheduled: "scheduled",
    cram: "cram",
    queued: "queued"
};

// setCurrentCard falls to the placeholder too often
export default function CardsSelector({setCurrentCard = f => f}) {
    const cards = useCards();
    const { outstanding, cram, queued } = cards;
    const [selectedCardsList, setSelectedCardsList] = useState(
        cardsLists.scheduled);
    const [isStopped, setStopped] = useState(true);
    const [currentlyViewedQueue, setViewedQueue] = useState(null);
    const { grade, memorize, reviewCrammed } = cards.functions;

    const emptyQueue = () => (
        currentlyViewedQueue === null ||
            (currentlyViewedQueue.cardsList.count === 0
             && currentlyViewedQueue.cardsList.isLoading === false));

    const crammedCards = {
        title: "Crammed cards",
        cardsList: cram,
        gradingFn: reviewCrammed
    };
    const outstandingCards = {
        title: "Outstanding cards",
        cardsList: outstanding,
        gradingFn: grade
    };
    const queuedCards = {
        title: "Queued cards",
        cardsList: queued,
        gradingFn: memorize
    };

    const outstandingChecker = getChecker(outstandingCards);
    const cramChecker = getChecker(crammedCards);
    const queuedChecker = getChecker(queuedCards);
    const stopReviews = () => {
        setStopped(true);
        setCurrentCard(undefined);
    };

    const selectCardQueue = () => {
        if(selectedCardsList === cardsLists.scheduled) {
            return outstandingCards;
        } else if (selectedCardsList === cardsLists.cram) {
            return crammedCards;
        } else if (selectedCardsList === cardsLists.queued) {
            return queuedCards;
        }
        return null;
    };

    // Flashing screen with another card - this is caused by
    // setting another tab from the queue as currently displayed
    // before moving on to the correct queue. When I solve this
    // problem, I may be able to remove this fragment (useEffect).
    useEffect(() => {
        if(emptyQueue()) {
            setCurrentCard(undefined);
        }
    }, [currentlyViewedQueue]);

    useEffect(() => {
        if (outstandingChecker()) {
            console.log("CardsSelector - outstanding: goToFirst");
            outstandingCards.cardsList.goToFirst();
        } else if (cramChecker()) {
            console.log("CardsSelector - cram: goToFirst");
            crammedCards.cardsList.goToFirst();
        } else if (queuedChecker()) {
            console.log("CardsSelector - queued: goToFirst");
            queuedCards.cardsList.goToFirst();
        }
        setViewedQueue(selectCardQueue());
    }, [outstanding, cram, queued, selectedCardsList]);

    const getReviewCallback = cardsList => () => {
        setSelectedCardsList(cardsList);
        setStopped(false);
    };

    // button callbacks
    const reviewScheduled = getReviewCallback(cardsLists.scheduled);
    const learnQueued = getReviewCallback(cardsLists.queued);
    const reviewCram = getReviewCallback(cardsLists.cram);

    return (
        isStopped ?
            // initial page
        <MainDisplay title="Select cards group to learn:">
          <Space direction="vertical"
                 size="large">
            <Button type="default"
                    size="large"
        // learn-outstanding-trigger
                    data-testid="learn-all-trigger"
                    onClick={reviewScheduled}>
              Learn&nbsp;scheduled&nbsp;-&nbsp;{outstanding.count}&nbsp;left
            </Button>
            <Button type="default"
                    size="large"
                    data-testid="learn-crammed-trigger"
                    onClick={reviewCram}>
              Learn&nbsp;from&nbsp;cram&nbsp;-&nbsp;{cram.count}&nbsp;left
            </Button>
            <Button type="dashed"
                    size="large"
                    data-testid="learn-new-trigger"
                    onClick={learnQueued}>
              Learn&nbsp;new&nbsp;cards&nbsp;-&nbsp;{queued.count}&nbsp;left
            </Button>
          </Space>
        </MainDisplay>
        : emptyQueue() ?
            // apparently this appears when screen flickers
        // when loading another page
        <p data-testid="no-more-cards-for-review"
           onClick={stopReviews}>
          No more items on this list...<br/>
          Click to return to the main page.
        </p>
        :
        <>
          {/* It's better to pass whole object (currentlyViewedQueue) */}
          {/* rather than each field separately */}
          <CardsReviewer cards={currentlyViewedQueue.cardsList}
                         setCurrentCard={setCurrentCard}
                         gradingFn={currentlyViewedQueue.gradingFn}
                         title={currentlyViewedQueue.title}
                         stopReviews={stopReviews}/>
          <LearningProgress scheduled={outstanding.count}
                            cramQueue={cram.count}
                            queued={queued.count}/>
        </>
    );
}
