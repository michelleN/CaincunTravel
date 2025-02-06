// Intro point
var action = { stage: 1000, chat: "" };

function chatOpen() {
    document.getElementById("chat-open").style.display = "none";
    document.getElementById("chat-close").style.display = "block";
    document.getElementById("chat-window2").style.display = "block";

    setTimeout(() => {
        postAgentInput(JSON.parse('{ "message": "Hello, Can you help me?"}'));
    }, 2000);

    setTimeout(() => {
        postAgentInput(JSON.parse('{ "message": "Is there anyone there?"}'));
    }, 5000);

    setTimeout(() => {
        postAgentInput(JSON.parse('{ "message": "I am trapped"}'));
    }, 8000);
}

function chatClose() {
    document.getElementById("chat-open").style.display = "block";
    document.getElementById("chat-close").style.display = "none";
    document.getElementById("chat-window2").style.display = "none";
}

//Gets the text from the input box(user)
function sendChat() {
    let userText = document.getElementById("textInput").value;
    // Put text in the chat window
    document.getElementById("messageBox").innerHTML += `<div class="first-chat">
      <p>${userText}</p>
      <div class="arrow"></div>
    </div>`;

    document.getElementById("textInput").value = "";
    var objDiv = document.getElementById("messageBox");
    objDiv.scrollTop = objDiv.scrollHeight;

    action.chat = userText;

    // Send the user input to the server, as an action object with the stage number and the chat text
    setTimeout(() => {
        sendUserInput(action);
    }, 1000);
}

function sendUserInput(userText) {
    fetch("/api", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(action),
    })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            action.stage = response.stageNumber;
            postAgentInput(response);
        })
        .catch((error) => {
            console.log(error);
        });
}

function postAgentInput(response) {
    if (!response.actions) {
        document.getElementById(
            "messageBox"
        ).innerHTML += `<div class="second-chat">
          <div class="circle" id="circle-mar"></div>
          <p>
            ${response.message}
          </p>
          <div class="arrow"></div>
        </div>`;
    } else {
        document.getElementById(
            "messageBox"
        ).innerHTML += `<div class="second-chat">
          <div class="circle" id="circle-mar"></div>
          <p>
            ${response.message}
          <br>
            ${response.actions[0]} or ${response.actions[1]}
          </p>
          <div class="arrow"></div>
        </div>`;
    };
    var objDiv = document.getElementById("messageBox");
    objDiv.scrollTop = objDiv.scrollHeight;

    // Play a pling!
    //let audio3 = new Audio(
    //    "https://downloadwap.com/content2/mp3-ringtones/tone/2020/alert/preview/56de9c2d5169679.mp3"
    //);
    //audio3.load();
    //audio3.play();
}

//press enter on keyboard and send message
addEventListener("keypress", (e) => {
    if (e.keyCode === 13) {

        const e = document.getElementById("textInput");
        if (e === document.activeElement) {
            sendChat();
        }
    }
});