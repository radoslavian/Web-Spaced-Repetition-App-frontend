export function cardTextForList(text) {
    // strips text of html tags and shortens it, removes white spaces
    // from start and end of the text
    const textLen = 50;
    const outputText = textCleaner(text);

    if (outputText.length < textLen) {
        return outputText;
    }
    return outputText.slice(0, textLen) + "...";
};

const textCleaner = composeAll(
    stripOfHtmlTags,
    text => text.trim(),
    removeNewlines,
    reduceWhiteSpaces);


// compose() and composeALl() - composing functions for a single input
// solution with StackOverflow origin:
// "Javascript Reduce from a compose function"

function compose(f, g) {
    return function(...args) {
        return f(g(...args));
    };
}

function composeAll(...fns) {
    return fns.reduceRight(compose);
}

export function stripOfHtmlTags(html) {
    // got it from StackOverflow:
    // https://stackoverflow.com/questions/822452/strip-html-from-text-javascript
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
};

export function reduceWhiteSpaces(text) {
    return text.replace(/\s+/g, " ");
}

export function removeNewlines(text) {
    // got it from StackOverflow
    return text.replace(/(\r\n|\n|\r)/gm, "");
}

export function getAuthToken() {
    const tokenString = localStorage.getItem('userToken');
    let userToken;
    try {
	userToken = JSON.parse(tokenString);
    } catch (e) { }
    return userToken?.auth_token;
}

export function saveToken(userToken) {
    localStorage.setItem('userToken', JSON.stringify(userToken));
}

export function timeOut(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(fn, timeout) {
    await timeOut(timeout);
    return fn();
}

