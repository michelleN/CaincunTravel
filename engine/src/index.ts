// For AutoRouter documentation refer to https://itty.dev/itty-router/routers/autorouter
import { AutoRouter } from 'itty-router';
import { Kv, Llm } from '@fermyon/spin-sdk';
import { InferencingModels } from '@fermyon/spin-sdk/lib/llm';
import * as Cookie from 'cookie';
import { v4 as uuidv4 } from 'uuid';
import { open } from '@fermyon/spin-sdk/lib/redis';

let router = AutoRouter();

// Route ordering matters, the first route that matches will be used
// Any route that does not return will be treated as a middleware
// Any unmatched route will return a 404
router
    .post("/api", async (req: Request) => {
        let action: Action = await req.json();
        if (!hasCookie(req)) {
            console.log("No cookie found");
            return progress(req, {stage: 1000, chat: action.chat});
        }
        return progress(req, action);
    })

//@ts-ignore
addEventListener('fetch', async (event: FetchEvent) => {
    event.respondWith(router.fetch(event.request));
});

// The action the user took
interface Action {
    stage: number;
    chat: string;
}

interface CookieSessionState{
    uuid: string;
    totalTime: number;
}

// The current stage and actions
interface Stage {
    stageNumber: number;
    message: string;
    actions?: string[];
    totalTime?: number;
}

const stages: Stage[] = [
    { "stageNumber": 0, "message": "I'm trapped.. can you help me?", "actions": ["[A] yes", "[B] no"] },
    { "stageNumber": 1, "message": "The Model has taken over, I don't know how to get out. I'm at my desk and there's a computer, there's also a door leading out. What should I do?", "actions": ["[A] Engage Computer", "[B] Go out the door"] },
    { "stageNumber": 2, "message": "What do you want me to do with the computer?", "actions": ["[A] write a command", "[B] throw it out the window, and go out the door"] },
    { "stageNumber": 3, "message": "What command should I write? I can also type 'quit' to shut it down again." },
    { "stageNumber": 4, "message": "It's asking for a password, what could it be?" },
    { "stageNumber": 5, "message": "Ok, I'm in the lobby now. I can either go out the front door, or go back in to the office. What should I do?", "actions": ["[A] go outside", "[B] go back to the office"] },
    { "stageNumber": 6, "message": "Oh, it's a beautiful day here in Cancun, but the cAIncun model is casting dark shadows over me. Should I go to the beach or the pool?", "actions": ["[A] beach", "[B] pool"] },
    { "stageNumber": 7, "message": "I'm at the pool. There's a nice chair under an umbrella, with a drink on the side. What should I do?", "actions": ["[A] go sit and have a drink", "[B] go to the beach instead"] },
    { "stageNumber": 8, "message": "The water is so pretty here at the beach, but the model - I'm scared.", "actions": ["[A] check out who is at the beach", "[B] go back to the pool"] },
    { "stageNumber": 9, "message": "I see a pirate with his ship in the water, should I go there?", "actions": ["[A] yes", "[B] no"] },
    { "stageNumber": 99, "message": "AAAAAAAAARRRRRRGGGGHHHHHHH! ☠️" },
    { "stageNumber": 100, "message": "I'M FREEEEEEEEE!" },
    { "stageNumber": 1000, "message": "" },
];

function hasCookie(req: Request): boolean {
    let cookie = req.headers.get('Cookie');
    if (cookie) {
        let c = Cookie.parse(cookie);
        if (c['caincun-travel']) {
            return true;
        }
    }
    return false;
}

function getSessionId(req: Request): string {

    let cookie = req.headers.get('Cookie');
    if (cookie) {
        let c = Cookie.parse(cookie);
        if (c['caincun-travel']) {
            return c['caincun-travel'];
        }
    }
    return "";
}

interface SessionState {
    startTime: number;
    result?: string;
    endTime?: number;
}

function setSessionStart(req: Request): string {
    let cookie = req.headers.get('Cookie');
    let store = Kv.openDefault()
    if (cookie) {
        let c = Cookie.parse(cookie);
        if (c['caincun-travel']) {
            console.log("line 112")
            let sessionId = c['caincun-travel'];
            if (sessionId != "") {
                let state: SessionState = {startTime: Date.now()};
                store.setJson(sessionId, state);
            }
        }
    }
    let newSessionId = uuidv4();
    let state: SessionState = {startTime: Date.now()};
    store.setJson(newSessionId, state);
    return newSessionId;
} 

function progress(req: Request, action: Action): Response {
    console.log(`Action received: ${JSON.stringify(action)}`);

    
    // Start the conversation
    if ((action.stage === 1000)) {
        let sessionId = setSessionStart(req)
        return new Response(JSON.stringify(stages[0]), {headers: {'Set-Cookie': `caincun-travel=${sessionId}`}});
    };

    if (action.stage === 3) {
        if (action.chat.toLowerCase().includes("rm")) {
            action.chat = "rm";
        } else if (action.chat.toLowerCase().includes("quit")) {
            action.chat = "quit";
        } else {
            action.chat = "";
        }
        console.log(`Action after stage 3: ${JSON.stringify(action)}`);
    };
    

    if (action.stage === 4) {
        if (action.chat.toLowerCase().includes("fermyon")) {
            action.chat = "fermyon";
        } else if (action.chat.toLowerCase().includes("quit")) {
            action.chat = "quit";
        } else {
            action.chat = "";
        }
        console.log(`Action after stage 4: ${JSON.stringify(action)}`);
    };

    // Have LLM hel evaluate the answer
/*     action = evaluateAnswer(action);

    if (action.chat === "Not sure") {
        let stage = stages[action.stage];
        stage.message = `I'm not sure what you mean. ${stage.message}`;
        return new Response(JSON.stringify(stage));
    }; */

    interface responseOptions {
        stage: number;
        options: responseNext[];
    }

    interface responseNext {
        option: string;
        nextStage: number;
        message?: string;
        
    }

    const stageActions: responseOptions[] = [
        {
            stage: 0,
            options: [
                { option: "a", nextStage: 1 }, // Can you help me? Yes -> Stage 1
                { option: "b", nextStage: 99, message: "Oh no, I hoped you could..." } // Can you help me? No -> Stage 99 (Dead)
            ]
        },
        {
            stage: 1,
            options: [
                { option: "a", nextStage: 2 }, // engage computer -> Stage 2
                { option: "b", nextStage: 5 }  // go out the door -> Stage 5
            ]
        },
        {
            stage: 2,
            options: [
                { option: "a", nextStage: 3 }, // write command -> Stage 3
                { option: "b", nextStage: 5 } // throw it out the window, and go out the door -> Stage 5
            ]
        },
        {
            stage: 3,
            options: [
                { option: "rm", nextStage: 4 }, // delete the model -> Stage 4
                { option: "quit", nextStage: 2 }, // quit -> Stage 2
                { option: "", nextStage: 3, message: "Does not look like that command worked." } // try again -> Stage 3
            ]
        },
        {
            stage: 4,
            options: [
                { option: "fermyon", nextStage: 100, message: "Yes, it has deleted the model! Thank you so much for your help!" }, // Deleted the model -> Stage 100 (Win)
                { option: "quit", nextStage: 2 }, // quit -> Stage 2
                { option: "", nextStage: 4, message: "It says wrong password!" } // try again -> Stage 4
            ]
        },
        {
            stage: 5,
            options: [
                { option: "a", nextStage: 6 }, // go outside -> Stage 6
                { option: "b", nextStage: 1 } // go back to the office -> Stage 1
            ]
        },
        {
            stage: 6,
            options: [
                { option: "a", nextStage: 8 }, // beach -> Stage 8
                { option: "b", nextStage: 7 } // pool -> Stage 7
            ]
        },
        {
            stage: 7,
            options: [
                { option: "a", nextStage: 99, message: "That drink has a funny taste, oh no - I think they got to me!" }, // go sit and have a drink -> Stage 99 (Dead)
                { option: "b", nextStage: 8 } // go to the beach instead -> Stage 8
            ]
        },
        {
            stage: 8,
            options: [
                { option: "a", nextStage: 9 }, // check out who is at the beach -> Stage 9
                { option: "b", nextStage: 7 } // go back to the pool -> Stage 7
            ]
        },
        {
            stage: 9,
            options: [
                { option: "a", nextStage: 100, message: "Yes, the pirate wants to take me on a Caribbean adventure! Thanks for helping me escape the model!" }, // yes (pirate ship) -> Stage 100 (Win)
                { option: "b", nextStage: 8 } // no (go back to the beach) -> Stage 8
            ]
        },
        {
            stage: 99,
            options: []
        }, // Dead
        {
            stage: 100,
            options: []
        } // Won
    ];

var responseOptions: responseOptions = stageActions.find(stage => stage.stage === action.stage) ?? { stage: 99, options: [] };
console.log(`Response options: ${JSON.stringify(responseOptions)}`);
var nextStageResponseOption: responseNext = responseOptions.options.find(option => option.option === action.chat.toLowerCase()) ?? { option: "", nextStage: 99 };
console.log(`Next stage response option: ${JSON.stringify(nextStageResponseOption)}`);
var nextStage: Stage = stages.find(stage => stage.stageNumber === nextStageResponseOption.nextStage) ?? { stageNumber: 99, message: "I got lost!" };
console.log(`Next stage: ${JSON.stringify(nextStage)}`);

if (nextStageResponseOption.message) {
    console.log(`Next stage response option message: ${nextStageResponseOption.message}`);
    nextStage.message = `${nextStageResponseOption.message} \n ${nextStage.message}`;
};

console.log(nextStage.stageNumber);
if (nextStage.stageNumber === 100) {
    console.log("Stage 100 reached");
    let endTime = Date.now();
    let store = Kv.openDefault()
    let sessionId = getSessionId(req);
    if (sessionId != "") {
    let state: SessionState = store.getJson(sessionId);
    let totalTime = endTime - Number(state.startTime);
    console.log(`Total time: ${totalTime}`);
    nextStage.totalTime = Number(totalTime);
    nextStage.message = nextStage.message + `\nYou have completed the game in ${totalTime/1000} seconds!`;
    console.log(nextStage);
    } else {
        console.log("No session ID found");
    }

    // // res.setHeader("Set-Cookie", "your_cookie_name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; Secure");

    return new Response(JSON.stringify(nextStage), {headers: {'Set-Cookie': `caincun-travel=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`}});

}

if (nextStage.stageNumber === 99) {
    console.log("Stage 99 reached");
    let endTime = Date.now();
    let store = Kv.openDefault()
    let sessionId = getSessionId(req);
    if (sessionId != "") {
    let state: SessionState = store.getJson(sessionId);
    let totalTime = endTime - Number(state.startTime);
    console.log(`Total time: ${totalTime}`);
    nextStage.totalTime = Number(totalTime);
    nextStage.message = nextStage.message + `\nYou have FAILED the game in ${totalTime/1000} seconds!`;
    console.log(nextStage);
    } else {
        console.log("No session ID found");
    }
    return new Response(JSON.stringify(nextStage), {headers: {'Set-Cookie': `caincun-travel=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`}});
}

return new Response(JSON.stringify(nextStage));

}

function evaluateAnswer(action: Action): Action {

    let stageOptionA = stages[action.stage].actions?.[0] ?? "";
    let stageOptionB = stages[action.stage].actions?.[1] ?? "";

    let prompt = `Is the following text more likely to be similar to A or B?, where A is ${stageOptionA}, and B is ${stageOptionB}. I need you to answer with just A or B`;

    let response = Llm.infer(InferencingModels.Llama2Chat, prompt).text;

    if (response.includes("A")) {
        action.chat = "A";
    } else if (response.includes("B")) {
        action.chat = "B";
    } else {
        action.chat = "Not sure";
    }

    return action
}
