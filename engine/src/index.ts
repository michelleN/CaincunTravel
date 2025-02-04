// For AutoRouter documentation refer to https://itty.dev/itty-router/routers/autorouter
import { AutoRouter } from 'itty-router';

let router = AutoRouter();

// Route ordering matters, the first route that matches will be used
// Any route that does not return will be treated as a middleware
// Any unmatched route will return a 404
router
    .post("/", async (req: Request) => {
        let action: Action = await req.json();
        return progress(action);
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

// The current stage and actions
interface Stage {
    stageNumber: number;
    message: string;
    actions?: string[];
}

const stages: Stage[] = [
    { "stageNumber": 0, "message": "I'm trapped.. can you help me?", "actions": ["yes", "no"]},
    { "stageNumber": 1, "message": "The Model has taken over, I don't know how to get out. I'm at my desk and there's a computer, there's also a door leading out. What should I do?", "actions": ["Engage Computer", "Go out the door"] },
    { "stageNumber": 2, "message": "What do you want me to do with the computer?", "actions": ["write a command", "throw it out the window"] },
    { "stageNumber": 3, "message": "What command should I write?" },
    { "stageNumber": 4, "message": "It's asking for a password, what could it be?" },
    { "stageNumber": 5, "message": "Ok, I'm in the lobby now. I can either go out the front door, or go back in to the office. What should I do?", "actions": ["go outside", "go back to the office"] },
    { "stageNumber": 6, "message": "Oh, it's a beautiful day here in Cancun, but the cAIncun model is casting dark shadows over my mood. Should I go to the beach or the pool?", "actions": ["beach", "pool"] },
    { "stageNumber": 7, "message": "Ok, I'm at the pool. There's a nice chair under an umbrella, with a drink on the side. What should I do?", "actions": ["go sit and have a drink", "go to the beach instead"] },
    { "stageNumber": 8, "message": "The water is so pretty here at the beach, but the model - I'm scared.", "actions": ["check out who's at the beach", "go to the pool"] },
    { "stageNumber": 9, "message": "I see a pirate with his ship in the water, should I go there?", "actions": ["yes", "no"] },
    { "stageNumber": 99, "message": "AAAAAAAAARRRRRRGGGGHHHHHHH!!!!!!!!! ☠️" },
    { "stageNumber": 100, "message": "I'M FREEEEEEEEE!!!!!!!!" },
];

function progress(action: Action) : Response {
    console.log(`Action received: ${JSON.stringify(action)}`);

    const stageActions: Record<number, Record<string, number>> = {
        0: {
            "yes": 1, // Can you help me? Yes -> Stage 1
            "no": 99, // Can you help me? No -> Stage 99 (Dead)
        },
        1: {
            "engage computer": 2, // Use the computer -> Stage 2
            "go out the door": 5,  // Go out the door -> Stage 5
        },
        2: {
            "write a command": 3,  // Write command -> Stage 3
            "throw it out the window": 99, // Throw computer -> Stage 99 (Dead)
        },
        3: {
            "rm": 4, // Delete the model -> Stage 4
            "na": 100, // Go out the door -> Stage 2
        },
        4: {
            "fermyon": 100, // Deleted the model -> Stage 100 (Win)
            "": 4, // Try again -> Stage 4
        },
        5: {
            "go outside": 100, // Going outside -> Stage 6
            "go back to the office": 1, // Back at the office -> Stage 1
        },
        6: {
            "beach": 8, // Go to the beach -> Stage 8
            "pool": 7, // Go to the pool -> Stage 7
        },
        7: {
            "go sit and have a drink": 99, // Drank the poison -> Stage 99 (Dead)
            "go to the beach instead": 8, // Go to the beach -> Stage 8
        },
        8: {
            "check out who's at the beach": 9, // Check out who's at the beach -> Stage 9
            "go to the pool": 7, // Go to the pool -> Stage 7
        },
        9: {
            "yes": 9, // Took the pirate ship -> Stage 100 (Win)
            "no": 8, // Go to the beach -> Stage 8
        },
        99: {}, // Dead
        100: {}, // Won
    };

    const defaultStage = 99; // Default fallback stage

    const nextStage = (() => {
        const stageOptions = stageActions[action.stage] || {};
        return stages.find(stage => stage.stageNumber === (stageOptions[action.chat.toLowerCase()] ?? defaultStage)) ?? stages[0];
    })();

    return new Response(JSON.stringify(nextStage));

/*
    var nextStage: Stage = stages[0];

     // Evaluate which stage the user is at
    switch (action.stage) {
        case 0:
            switch (action.chat.toLowerCase()) {
                // Answering 'yes' to "Can you help me?"
                case "yes":
                    nextStage = stages.find(stage => stage.number === 1) ?? stages[0];
                    break;
                // Answering 'no' to "Can you help me?"
                case "no":
                    // Stage 99 is dead!
                    nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
                    break;
            }
        // 1 I'm at my desk and there's a computer, there's also a door leading out. What should I do?
        case 1:
            switch (action.chat.toLowerCase()) {
                case "engage computer":
                    nextStage = stages.find(stage => stage.number === 2) ?? stages[0];
                    break;
                case "go out the door":
                    nextStage = stages.find(stage => stage.number === 3) ?? stages[0];
                    break;
            }
            nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
            break;
        // 2 What do you want me to do with the computer:
        case 2:
            switch (action.chat.toLowerCase()) {
                case "write a command":
                    nextStage = stages.find(stage => stage.number === 4) ?? stages[0];
                    break;
                case "throw it out the window":
                    nextStage = stages.find(stage => stage.number === 3) ?? stages[0];
                    break;
            }
            nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
            break;
        // 4 Engaging with computer
        case 4:
            switch (action.chat.toLowerCase()) {
                case "engage computer":
                    nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
                    break;
                case "go out the door":
                    nextStage = stages.find(stage => stage.number === 100) ?? stages[0];
                    break;
            }
            nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
            break;
        // 3 I'm in the lobby
        case 4:
            switch (action.chat.toLowerCase()) {
                case "engage computer":
                    nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
                    break;
                case "go out the door":
                    nextStage = stages.find(stage => stage.number === 100) ?? stages[0];
                    break;
            }
            nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
            break;
        // Dead
        case 99:
            nextStage = stages.find(stage => stage.number === 99) ?? stages[0];
        // Won
        case 100:
            break;
    } */

}
