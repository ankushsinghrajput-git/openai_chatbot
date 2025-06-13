
const messageForm = document.querySelector(".prompt__form");
const chatHistoryContainer = document.querySelector(".chats");
const clearChatButton = document.getElementById("deleteButton");
let sendButtonElement = document.querySelector("#sendButton");
let stopBtn = document.querySelector("#stopButton");




let currentUserMessage = null;
let isGeneratingResponse = false;
let getTitle = false;
let typingInterval = null;
let stopGenerating = false;


const GOOGLE_API_KEY = "AIzaSyDIKZiDOxw_5F8jOzgbm4pQyLoDDo62-L8";
const API_REQUEST_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_API_KEY}`;

const loadSavedChatHistory = () => {
    const savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];

    chatHistoryContainer.innerHTML = "";

    savedConversations.forEach(conversations => {
        const userMessageHtml = `
            <div class="message__content">
                <p class="message__text">${conversations.userMessage}</p>
            </div>
        `;
        const outgoingMessageElement = createChatMessageHTML(userMessageHtml, "message--outgoing");
        chatHistoryContainer.appendChild(outgoingMessageElement);

        const responseText = conversations.apiresponse?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        const responseHtml = `
        
           <div class="message__content">
                <p class="message__text"></p>
                <div class="typing-loader">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
            <span onClick="copyMessageToClipboard(this)" class="message__icon hide"><i class='bx bx-copy-alt'></i></span>
        
        `;

        const incomingMessageElement = createChatMessageHTML(responseHtml, "message--incoming");

        chatHistoryContainer.appendChild(incomingMessageElement);

        typingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement, false);
    });

    document.body.classList.toggle("hide-header", savedConversations.length > 0);
};


const createChatMessageHTML = (htmlContent, ...cssClasses) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", ...cssClasses);          //creates a new message element
    messageElement.innerHTML = htmlContent;
    return messageElement;
}

const requestApiResponse = async (incomingMessageElement) => {
    const messageTextElement = incomingMessageElement.querySelector(".message__text");

    try {
        const response = await fetch(API_REQUEST_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: currentUserMessage }] }] }) });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error.message);

        const responseText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) throw new Error("Invalid API Response!");

        const parsedApiResponse = marked.parse(responseText);
        const rawApiResponse = responseText;

        typingEffect(rawApiResponse, parsedApiResponse, messageTextElement, incomingMessageElement);

        let savedConversations = JSON.parse(localStorage.getItem("saved-api-chats")) || [];
        savedConversations.push({
            userMessage: currentUserMessage,
            apiResponse: responseData
        })
        localStorage.setItem("saved-api-chats", JSON.stringify(savedConversations));

        console.log(rawApiResponse);
    } catch (error) {
        isGeneratingResponse = false;
        messageTextElement.innerText = error.message;
        messageTextElement.closest(".message").classList.add("message--error");
    } finally {
        incomingMessageElement.classList.remove("message--loading");
        incomingMessageElement.classList.remove(".typing-loader");

    }



};

const addSendButton = () => {
    const SendBtn = document.createElement('button');
    SendBtn.className = 'prompt__form-button';
    SendBtn.id = 'sendButton';
    SendBtn.innerHTML = `<i class='bxr  bxs-send-alt' style='color:#000000'></i>`;
    document.querySelector(".prompt__input-wrapper").appendChild(SendBtn);
}

const displayLoadingAnimation = () => {
    const loadingHtml = `

        <div class="message__content">
            <p class="message__text"></p>
            <div class="typing-loader">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
       
    
    `;

    const loadingMessageElement = createChatMessageHTML(loadingHtml, "message--incoming", "message--loading");
    chatHistoryContainer.appendChild(loadingMessageElement);

    sendButtonElement = document.querySelector('#sendButton');
    if (sendButtonElement && sendButtonElement.parentElement) {
        sendButtonElement.parentElement.removeChild(sendButtonElement);
    }


    stopBtn = document.createElement('button');
    stopBtn.id = 'stopButton';
    stopBtn.innerHTML = `<i class='bxr bxs-stop-circle bx-beat'  style="color:#000000; font-size:1.8rem;"></i> `;
    stopBtn.className = 'prompt__form-button';

    document.querySelector(".prompt__input-wrapper").appendChild(stopBtn);

    stopBtn.addEventListener('click', () => {
        stopGenerating = true;
        isGeneratingResponse = false;
        stopBtn.remove();
        addSendButton();
        clearInterval(typingInterval);
    });


    requestApiResponse(loadingMessageElement);
};



const typingEffect = (rawText, htmlText, messageElement, incomingMessageElement, effect = true) => {

    let wordArray = rawText.split(' ');
    let wordIndex = 0;
    if (!effect) {
        messageElement.innerHTML = htmlText;
        incomingMessageElement.querySelector(".typing-loader")?.remove();

        isGeneratingResponse = false;
        return;
    }

    if (stopGenerating) {
        clearInterval(typingInterval);
        incomingMessageElement.querySelector('.typing_loader')?.remove();
        htmlText = "Message Generation is Stoped ! ";
        wordArray = ["Message", "Generation", "is", "Stopped", "!"];
        isGeneratingResponse = false;
    }



    typingInterval = setInterval(() => {
        incomingMessageElement.querySelector(".typing-loader")?.remove();
        messageElement.innerText += (wordIndex === 0 ? '' : ' ') + wordArray[wordIndex++];
        if (wordIndex === wordArray.length) {
            clearInterval(typingInterval);
            isGeneratingResponse = false;
            messageElement.innerHTML = htmlText;
            stopBtn.remove();
            if (!stopGenerating) {
                addSendButton();
            }

        }
    }, 75);
};

const handlingOutgoingMessages = () => {
    stopGenerating = false;
    currentUserMessage = messageForm.querySelector(".prompt__form-input").value.trim() || currentUserMessage;
    if (!currentUserMessage || isGeneratingResponse) return;
    isGeneratingResponse = true;
    const outgoingMessageHTML = `
        <div class="message__content">
            <p class="message__text"></p>
        </div>
    `
    const outgoingMessageElement = createChatMessageHTML(outgoingMessageHTML, "message--outgoing");
    outgoingMessageElement.querySelector(".message__text").innerText = currentUserMessage;
    chatHistoryContainer.appendChild(outgoingMessageElement);

    messageForm.reset();
    setTimeout(displayLoadingAnimation, 500);
    document.body.classList.add("hide-header");
    document.querySelector(".navbar").classList.add("show-navbar");

};

messageForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (getTitle === false) {
        const value = messageForm.querySelector(".prompt__form-input").value;
        getTitle = true;
        document.title = value;
    }
    handlingOutgoingMessages();

});

clearChatButton.addEventListener('click', () => {
    if (confirm("Are u sure , u want to delete chat history ?")) {
        localStorage.removeItem("saved-api-chats");
        loadSavedChatHistory();
        isGeneratingResponse = false;
        currentUserMessage = null;
        document.querySelector(".navbar").classList.remove("show-navbar");
    }
});

// loadSavedChatHistory();