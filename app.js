const STORAGE_KEY = "gp-plumbing-ai-booking";
const serviceKeywords = [
  { match: ["leak", "pipe", "drip"], value: "Leak Repair" },
  { match: ["drain", "clog", "sink", "toilet"], value: "Drain Cleaning" },
  { match: ["heater", "hot water", "tankless"], value: "Water Heater Service" },
  { match: ["install", "faucet", "fixture"], value: "Fixture Installation" },
  { match: ["emergency", "burst", "flood"], value: "Emergency Plumbing" }
];

const timeKeywords = [
  { match: ["morning"], value: "8:00 AM - 10:00 AM" },
  { match: ["late morning"], value: "10:00 AM - 12:00 PM" },
  { match: ["noon", "midday"], value: "12:00 PM - 2:00 PM" },
  { match: ["afternoon"], value: "2:00 PM - 4:00 PM" },
  { match: ["evening", "after work"], value: "4:00 PM - 6:00 PM" }
];

const defaultState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  service: "",
  date: "",
  time: "",
  details: ""
};

let bookingState = { ...defaultState };

function getBookingState() {
  return { ...bookingState };
}

function saveBookingState(nextState) {
  bookingState = { ...defaultState, ...nextState };
  renderPreview();
}

function renderPreview() {
  const previewNodes = document.querySelectorAll("#bookingPreview");
  const state = getBookingState();
  const entries = [
    ["Service", state.service || "Not collected yet"],
    ["Preferred Date", state.date || "Not collected yet"],
    ["Preferred Time", state.time || "Not collected yet"],
    ["Address", state.address || "Not collected yet"],
    ["Issue", state.details || "Not collected yet"]
  ];

  previewNodes.forEach((node) => {
    node.innerHTML = "";
    entries.forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      wrapper.append(dt, dd);
      node.appendChild(wrapper);
    });
  });
}

function setMinDate() {
  const dateInput = document.querySelector('input[name="date"]');
  if (!dateInput) return;
  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;
}

function applyStateToForm() {
  const form = document.querySelector("#bookingForm");
  if (!form) return;

  const state = getBookingState();
  Object.entries(state).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && value) {
      field.value = value;
    }
  });
}

function collectFormData(form) {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
}

function inferService(message) {
  const lower = message.toLowerCase();
  const found = serviceKeywords.find((entry) => entry.match.some((word) => lower.includes(word)));
  return found?.value || "";
}

function inferTime(message) {
  const lower = message.toLowerCase();
  const found = timeKeywords.find((entry) => entry.match.some((word) => lower.includes(word)));
  return found?.value || "";
}

function inferDate(message) {
  const lower = message.toLowerCase();
  const now = new Date();

  if (lower.includes("today")) {
    return now.toISOString().split("T")[0];
  }

  if (lower.includes("tomorrow")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  if (lower.includes("this week")) {
    const inTwoDays = new Date(now);
    inTwoDays.setDate(now.getDate() + 2);
    return inTwoDays.toISOString().split("T")[0];
  }

  return "";
}

function mergeBookingState(partial) {
  const next = { ...getBookingState(), ...partial };
  saveBookingState(next);
  return next;
}

function createAssistantReply(message) {
  const lower = message.toLowerCase();
  const partial = {};

  if (!getBookingState().service) {
    partial.service = inferService(message);
  } else if (inferService(message)) {
    partial.service = inferService(message);
  }

  if (!getBookingState().time || inferTime(message)) {
    partial.time = inferTime(message);
  }

  if (!getBookingState().date || inferDate(message)) {
    partial.date = inferDate(message);
  }

  if (lower.includes("denton")) {
    partial.address = getBookingState().address || "Denton, TX";
  }

  if (message.trim().length > 8) {
    partial.details = message.trim();
  }

  const state = mergeBookingState(partial);

  if (lower.includes("book") || lower.includes("schedule")) {
    return `I can help with that. I’ve started your booking for ${state.service || "plumbing service"} ${state.date ? `on ${state.date}` : ""} ${state.time ? `during ${state.time}` : ""}. Add your contact details on the booking page to confirm it whenever you're ready.`;
  }

  if (lower.includes("water heater")) {
    return "Yes, GP Plumbing handles water heater repair and replacement. If you want, I can add that to your booking details and carry it into the scheduling form.";
  }

  if (lower.includes("price") || lower.includes("cost")) {
    return "Pricing depends on the issue and site conditions, but the quickest next step is booking a visit so GP Plumbing can confirm the scope. I can collect the service type and preferred time now.";
  }

  if (state.service) {
    return `It sounds like you need ${state.service}. I’ve added that to your booking preview${state.date ? ` for ${state.date}` : ""}${state.time ? ` at ${state.time}` : ""}. You can keep chatting here or open the booking page to confirm it.`;
  }

  return "I can help you book service, answer basic questions, and collect visit details. Tell me what plumbing issue you’re dealing with and when you’d like someone to come by.";
}

function addMessage(text, role) {
  const container = document.querySelector("#chatMessages");
  if (!container) return;

  const message = document.createElement("div");
  message.className = `message message-${role}`;
  message.textContent = text;
  container.appendChild(message);
  container.scrollTop = container.scrollHeight;
}

function speak(text) {
  void text;
}

function setupChat() {
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#chatInput");
  const voiceButton = document.querySelector("#voiceButton");

  if (!form || !input) return;

  addMessage(
    "Hi, I’m the GP Plumbing assistant. I can answer questions, collect your plumbing issue, and help you start a booking in Denton.",
    "assistant"
  );

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    const reply = createAssistantReply(text);
    addMessage(reply, "assistant");
    speak(reply);
  });

  document.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.dataset.prompt || "";
      input.value = text;
      form.requestSubmit();
    });
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!voiceButton) return;

  if (!SpeechRecognition) {
    voiceButton.disabled = true;
    voiceButton.textContent = "Voice Unsupported";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  voiceButton.addEventListener("click", () => {
    recognition.start();
    voiceButton.textContent = "Listening...";
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    input.value = transcript;
    form.requestSubmit();
  });

  recognition.addEventListener("end", () => {
    voiceButton.textContent = "Start Voice";
  });
}

function setupBookingForm() {
  const form = document.querySelector("#bookingForm");
  const applyButton = document.querySelector("#applyAssistantBooking");
  const status = document.querySelector("#bookingStatus");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form) return;

  applyStateToForm();
  setMinDate();

  applyButton?.addEventListener("click", () => {
    applyStateToForm();
    status.textContent = "AI-collected booking details were added to the form.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const appointment = collectFormData(form);
    saveBookingState({ ...getBookingState(), ...appointment });

    if (status) {
      status.textContent = "Sending booking request...";
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    try {
      const response = await fetch(
        "https://formsubmit.co/ajax/satvikreddymedikonda@gmail.com",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            ...appointment,
            _replyto: appointment.email,
            _subject: "New GP Plumbing booking request",
            _template: "table",
            _captcha: "true",
            _url: window.location.href
          })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to submit booking");
      }

      const result = await response.json();
      if (result.success !== "true" && result.success !== true) {
        throw new Error("Unable to submit booking");
      }

      status.textContent =
        "Booking request sent successfully. Check your email inbox for the submission notification.";
      form.reset();
      setMinDate();
    } catch (error) {
      console.error(error);
      status.textContent =
        "We could not send the booking right now. If this is the first live submission, confirm the FormSubmit activation email for satvikreddymedikonda@gmail.com and try again.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Confirm Booking";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bookingState = { ...defaultState };
  renderPreview();
  setupChat();
  setupBookingForm();
});
