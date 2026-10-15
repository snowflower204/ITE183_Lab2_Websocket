"use strict";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobileNavigation = matchMedia("(max-width: 700px)");
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navLinks");

document.body.classList.add("nav-ready");
menuToggle.hidden = false;

function closeMenu(restoreFocus = false) {
  navigation.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  if (restoreFocus) menuToggle.focus();
}

menuToggle.addEventListener("click", function () {
  const expanded = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(expanded));
  navigation.classList.toggle("is-open", expanded);
});
navigation.addEventListener("click", function (event) {
  if (event.target.closest("a")) closeMenu();
});
document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) closeMenu(true);
});
document.addEventListener("click", function (event) {
  if (!event.target.closest(".nav")) closeMenu();
});
mobileNavigation.addEventListener("change", function () { closeMenu(); });

// Content stays visible when JavaScript or IntersectionObserver is unavailable.
if ("IntersectionObserver" in window) {
  if (!reducedMotion.matches) document.documentElement.classList.add("motion-ready");
  const revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach(function (element) { revealObserver.observe(element); });

  const sectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      document.querySelectorAll(".nav-link").forEach(function (link) {
        if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-15% 0px -65% 0px", threshold: 0 });
  document.querySelectorAll("main > section").forEach(function (section) { sectionObserver.observe(section); });
}

// One animation frame per scroll update; offscreen layers are skipped.
const parallaxGroups = Array.from(document.querySelectorAll("main > section")).map(function (section) {
  return { section: section, layers: Array.from(section.querySelectorAll("[data-parallax]")) };
}).filter(function (group) { return group.layers.length; });
let framePending = false;
function updateParallax() {
  framePending = false;
  if (reducedMotion.matches || document.hidden) return;
  const viewportHeight = innerHeight;
  const mobileScale = innerWidth <= 700 ? 0.55 : 1;
  parallaxGroups.forEach(function (group) {
    const bounds = group.section.getBoundingClientRect();
    if (bounds.bottom < -120 || bounds.top > viewportHeight + 120) return;
    group.layers.forEach(function (layer) {
      const movement = Math.max(-100, Math.min(100, -bounds.top * Number(layer.dataset.parallax) * mobileScale));
      layer.style.setProperty("--offset", movement.toFixed(2) + "px");
    });
  });
}
function requestParallax() {
  if (!framePending && !reducedMotion.matches && !document.hidden) {
    framePending = true;
    requestAnimationFrame(updateParallax);
  }
}
addEventListener("scroll", requestParallax, { passive: true });
addEventListener("resize", requestParallax, { passive: true });
requestParallax();

const categoryMessages = new Map([
  ["research", { label: "RESEARCH & ACADEMIC PROJECTS", message: "Start with your research question. What would you like to understand more clearly?" }],
  ["capstone", { label: "CAPSTONE DEVELOPMENT", message: "Bring your project concept. Let's think about a practical first milestone." }],
  ["ai", { label: "AI & MACHINE LEARNING", message: "Start with a problem, a dataset, or an AI idea you'd like to explore." }],
  ["iot", { label: "IOT & EMERGING TECHNOLOGIES", message: "Share an idea for a connected device or a real-world challenge you want to explore." }]
]);
const categoryCards = document.querySelectorAll(".category-card");
categoryCards.forEach(function (card) {
  card.addEventListener("click", function () {
    const topic = categoryMessages.get(card.dataset.topic);
    if (!topic) return;
    categoryCards.forEach(function (other) { other.setAttribute("aria-pressed", String(other === card)); });
    document.getElementById("categoryLabel").textContent = topic.label;
    document.getElementById("categoryHelp").textContent = topic.message;
    document.getElementById("continueChat").href = "/chat?topic=" + encodeURIComponent(card.dataset.topic);
  });
});

// Promotional simulation only. This file never creates a WebSocket.
const demo = document.getElementById("conversationDemo");
const demoScroller = document.getElementById("demoMessages");
const demoMessages = Array.from(document.querySelectorAll(".demo-message"));
const typingIndicator = document.getElementById("typingIndicator");
const replayButton = document.getElementById("replayDemo");
const pauseButton = document.getElementById("pauseDemo");
const demoStatus = document.getElementById("demoStatus");
const sequence = [
  { message: 0, delay: 650 },
  { typing: true, delay: 850 },
  { message: 1, delay: 1250 },
  { message: 2, delay: 1750 },
  { typing: true, delay: 850 },
  { message: 3, delay: 1450 },
  { message: 4, delay: 1650 },
  { typing: true, delay: 850 },
  { message: 5, delay: 1400 }
];
let demoStarted = false;
let demoComplete = false;
let demoVisible = false;
let userPaused = false;
let stepIndex = 0;
let timer = null;
let dueAt = 0;
let remaining = null;

function cancelStep() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, dueAt - performance.now());
  }
}

function updateDemoControls() {
  pauseButton.hidden = !demoStarted || reducedMotion.matches;
  pauseButton.disabled = demoComplete;
  pauseButton.textContent = userPaused ? "Resume" : "Pause";
  demo.classList.toggle("demo-paused", userPaused || !demoVisible || document.hidden);
}

function scheduleStep() {
  updateDemoControls();
  if (!demoStarted || demoComplete || userPaused || !demoVisible || document.hidden || reducedMotion.matches || timer !== null) return;
  const delay = remaining === null ? sequence[stepIndex].delay : remaining;
  dueAt = performance.now() + delay;
  timer = setTimeout(function () {
    timer = null;
    remaining = null;
    const followLatest = demoScroller.scrollHeight - demoScroller.clientHeight - demoScroller.scrollTop < 65;
    const step = sequence[stepIndex++];
    if (step.typing) {
      typingIndicator.hidden = false;
    } else {
      typingIndicator.hidden = true;
      const message = demoMessages[step.message];
      message.hidden = false;
      message.classList.add("is-new");
    }
    if (followLatest) demoScroller.scrollTop = demoScroller.scrollHeight;
    if (stepIndex === sequence.length) {
      demoComplete = true;
      demoStatus.textContent = "Sample conversation complete. You can replay it.";
    }
    scheduleStep();
  }, delay);
}

function showFullConversation() {
  cancelStep();
  demoStarted = true;
  demoComplete = true;
  userPaused = false;
  typingIndicator.hidden = true;
  demoMessages.forEach(function (message) { message.hidden = false; message.classList.remove("is-new"); });
  demoScroller.scrollTop = 0;
  demoStatus.textContent = "Full sample conversation shown. Motion is reduced.";
  updateDemoControls();
}

function startDemo() {
  cancelStep();
  if (reducedMotion.matches) { showFullConversation(); return; }
  demoStarted = true;
  demoComplete = false;
  userPaused = false;
  stepIndex = 0;
  remaining = null;
  typingIndicator.hidden = true;
  demoMessages.forEach(function (message) { message.hidden = true; message.classList.remove("is-new"); });
  demoScroller.scrollTop = 0;
  demoStatus.textContent = "Playing a sample conversation. Use Pause to stop the animation.";
  scheduleStep();
}

pauseButton.addEventListener("click", function () {
  if (demoComplete) return;
  userPaused = !userPaused;
  if (userPaused) cancelStep();
  demoStatus.textContent = userPaused ? "Sample conversation paused." : "Sample conversation resumed.";
  scheduleStep();
});
replayButton.hidden = false;
replayButton.addEventListener("click", startDemo);

if (reducedMotion.matches) showFullConversation();
else demoMessages.forEach(function (message) { message.hidden = true; });

if ("IntersectionObserver" in window) {
  const demoObserver = new IntersectionObserver(function (entries) {
    demoVisible = entries[0].isIntersecting;
    if (demoVisible && !demoStarted) startDemo();
    else if (demoVisible) scheduleStep();
    else { cancelStep(); updateDemoControls(); }
  }, { threshold: 0.18 });
  demoObserver.observe(demo);
} else {
  demoVisible = true;
  // Without viewport observation, keep the sample static and readable.
  showFullConversation();
}

document.addEventListener("visibilitychange", function () {
  if (document.hidden) cancelStep();
  else { scheduleStep(); requestParallax(); }
  updateDemoControls();
});
reducedMotion.addEventListener("change", function () {
  if (reducedMotion.matches) {
    document.documentElement.classList.remove("motion-ready");
    parallaxGroups.forEach(function (group) { group.layers.forEach(function (layer) { layer.style.removeProperty("--offset"); }); });
    showFullConversation();
  } else {
    // Do not hide already readable content or restart a completed conversation.
    requestParallax();
    updateDemoControls();
  }
});
