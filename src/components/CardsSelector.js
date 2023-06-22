import { useCards } from "../contexts/CardsProvider";
import CardsReviewer from "./CardsReviewer";
import LearningProgress from "./LearningProgress";
import { useState, useEffect } from "react";

export default function CardsSelector() {
    const cards = useCards();
    const { outstanding, cram, queued } = cards;
    const [learnNew, setLearnNew] = useState(false);
    const [isStopped, setStopped] = useState(true);
    const [currentlyViewedQueue, setViewedQueue] = useState(null);
    const { grade, memorize, reviewCrammed } = cards.functions;

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

    const getChecker = obj => () => {
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
    const outstandingChecker = getChecker(outstandingCards);
    const cramChecker = getChecker(crammedCards);
    const queuedChecker = getChecker(queuedCards);

    const selectCardQueue = () => {
        if(learnNew) {
            return queuedCards;
        }
        for (let cardQueue of [outstandingCards, crammedCards]) {
            if (cardQueue.cardsList.currentPage.length !== 0) {
                return cardQueue;
            }
        }
        return null;
    };

    useEffect(() => {
        if (outstandingChecker()) {
            console.log("CardsSelector - outstanding: goToFirst");
            outstandingCards.cardsList.goToFirst();
        } else if (cramChecker()) {
            console.log("CardsSelector - cram: goToFirst");
            crammedCards.cardsList.goToFirst();
        }
        setViewedQueue(selectCardQueue());
    }, [outstanding, cram, queued, learnNew]);

    return (
        isStopped ?
            <>
              <p data-testid="learn-all-trigger"
                 onClick={() => {
                     if(learnNew) {
                         setLearnNew(false);
                     }
                     setStopped(false);
                 }}>
                Learn scheduled
              </p>
              {/* shall be disabled if the 'queued' is empty */}
              <p data-testid="learn-new-trigger"
                 onClick={() => {
                     if(!learnNew) {
                         setLearnNew(true);
                     }
                     setStopped(false);
                 }}>
                Learn new cards
              </p>
            </>
        :
        currentlyViewedQueue !== null ?
            <>
              <CardsReviewer cards={currentlyViewedQueue.cardsList}
                             gradingFn={currentlyViewedQueue.gradingFn}
                             title={currentlyViewedQueue.title}
                             stopReviews={() => setStopped(true)}/>
              <LearningProgress scheduled={outstanding.count}
                                cramQueue={cram.count}
                                queued={queued.count}/>
        </>
        :
        <p data-testid="please-wait-component"
           onClick={() => setStopped(true)}>
          No more items on this list...<br/>
          Click to return to the main page.
        </p>
    );
}
