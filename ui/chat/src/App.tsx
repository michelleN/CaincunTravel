import { DeepChat } from "deep-chat-react";
import "./styles.css";

export default function App() {
  const initialMessages = [
    { role: "user", text: "Good morning! Welcome to Google! 🎉 How can I assist you today" },
    { role: "ai", text: "Hi! Thank you! I'm excited to be here. What should I do first?" },
    {role: "user",text:"Sure! My name is Sundar , and my ID is 12345."},
    {role:"ai",text:"Wonderful, Sundar! Next, I'll need you to set up your account password. Please create a strong password containing at least eight characters, including uppercase letters, lowercase letters, numbers, and symbols."}
  ];
  // demo/style/textInput are examples of passing an object directly into a property
  // initialMessages is an example of passing a state object into a property
  return (
    <div className="App">
      <h1>OnBoard Assistant</h1>
      <DeepChat
        demo={true}
        style={{ borderRadius: "10px" }}
        textInput={{ placeholder: { text: "Welcome to the demo!" } }}
        initialMessages={initialMessages}
      />
    </div>
  );
}
