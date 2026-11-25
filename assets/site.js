const main = document.querySelector("main");
const navigation = document.querySelector("#navigation");
const menu = document.querySelector("#menu");
const mobileEnquire = document.querySelector("#mobile-enquire");

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(label, href, className) {
  const node = element("a", label, className);
  node.href = href;
  return node;
}

function picture(config, { fallback, className, lazy = false } = {}) {
  const source = (typeof config === "string" ? config : config?.src) || fallback;
  if (!source) return null;
  const url = new URL(source, document.baseURI);
  if (!["http:", "https:"].includes(url.protocol)) return null;
  const img = element("img", null, className);
  img.src = url.href;
  img.alt = config?.alt ?? "";
  img.loading = lazy ? "lazy" : "eager";
  img.addEventListener("error", () => img.remove(), { once: true });
  return img;
}

function appendText(parent, tag, text) {
  if (text) parent.append(element(tag, text));
}

function section(id, heading, className = "section") {
  const wrapper = element("section", null, className);
  wrapper.id = id;
  const content = element("div", null, "shell");
  const title = element("h2", heading);
  title.id = id + "-title";
  wrapper.setAttribute("aria-labelledby", title.id);
  content.append(title);
  wrapper.append(content);
  main.append(wrapper);
  return content;
}

function cards(id, heading, items, render) {
  if (!items?.length) return;
  const content = section(id, heading);
  const grid = element("div", null, "grid");
  for (const item of items) grid.append(render(item));
  content.append(grid);
}

function card(title, description, className = "card") {
  const node = element("article", null, className);
  appendText(node, "h3", title);
  appendText(node, "p", description);
  return node;
}

function contactLinks(enquiries) {
  const actions = [];
  const email = enquiries?.email?.trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    actions.push({ method: "email", label: "Email us", href: "mailto:" + encodeURIComponent(email).replace("%40", "@") });
  }
  const phone = enquiries?.whatsappNumber?.replace(/[+\s()-]/g, "");
  if (phone && /^[1-9]\d{6,14}$/.test(phone)) {
    const href = new URL("https://wa.me/" + phone);
    if (enquiries.whatsappMessage) href.searchParams.set("text", enquiries.whatsappMessage);
    actions.push({ method: "whatsapp", label: "Message on WhatsApp", href: href.href });
  }
  return actions.sort((a, b) => Number(b.method === enquiries.preferredMethod) - Number(a.method === enquiries.preferredMethod));
}

function setMenu(open) {
  menu.setAttribute("aria-expanded", String(open));
  menu.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  navigation.toggleAttribute("data-open", open);
}

function render(config) {
  const { site, home, subjects, classDetails, fees, timetable, testimonials, enquiries } = config;
  if (!site?.name || !home?.headline) throw new Error("Missing site name or homepage headline");
  document.documentElement.dataset.theme = config.theme || "navy-gold";
  document.title = site.name;
  document.querySelector('meta[name="description"]').content = site.description || "";
  const brand = document.querySelector("#brand");
  const mark = picture(site.logo) ?? element("span", null, "book");
  mark.setAttribute("aria-hidden", "true");
  brand.append(mark, document.createTextNode(site.name));

  const actions = contactLinks(enquiries);
  const hero = element("section", null, "hero");
  const heroGrid = element("div", null, "shell hero-grid");
  const copy = element("div", null, "hero-copy");
  copy.append(element("h1", home.headline));
  appendText(copy, "p", home.description);
  if (actions.length) copy.append(link(home.enquiryButtonLabel || "Enquire About Classes", "#enquiries", "button"));
  heroGrid.append(copy);
  const heroImage = picture(home.image, { fallback: "./assets/tutoring.webp" });
  if (heroImage) {
    heroImage.addEventListener("error", () => heroGrid.classList.remove("has-photo"), { once: true });
    heroGrid.classList.add("has-photo");
    heroGrid.append(heroImage);
  }
  hero.append(heroGrid);
  main.replaceChildren(hero);

  cards("subjects", subjects?.heading || "Subjects & Year Levels", subjects?.items, item => {
    const node = card(item.name, item.description, "card subject");
    if (item.yearLevels?.length) {
      const list = element("ul", null, "tags");
      list.setAttribute("aria-label", "Year levels");
      for (const year of item.yearLevels) list.append(element("li", year));
      node.append(list);
    }
    return node;
  });

  const tutors = config.tutors?.items ?? (config.tutor?.name ? [config.tutor] : []);
  cards("tutors", tutors.length === 1 ? "Meet the Tutor" : config.tutors?.heading || "Meet the Tutors", tutors, tutor => {
    const node = card(tutor.name, tutor.bio);
    const photo = picture(tutor.photo, { className: "portrait", lazy: true });
    if (photo) {
      node.prepend(photo);
    } else {
      const initials = (tutor.name || "").trim().split(/\s+/).slice(0, 2).map(name => Array.from(name)[0]).join("");
      const avatar = element("span", initials, "initials");
      avatar.setAttribute("aria-hidden", "true");
      node.prepend(avatar);
    }
    return node;
  });

  const details = [
    ["Location", classDetails?.location],
    ["Delivery", classDetails?.deliveryModes?.join(", ")],
    ["Lesson formats", classDetails?.lessonFormats?.join(", ")],
    ["Session length", classDetails?.sessionDurationMinutes && classDetails.sessionDurationMinutes + " minutes"]
  ].filter(([, value]) => value);
  if (details.length) {
    const content = section("details", classDetails.heading || "Class Details");
    const list = element("dl", null, "grid facts");
    for (const [label, value] of details) {
      const group = element("div", null, "card");
      group.append(element("dt", label), element("dd", value));
      list.append(group);
    }
    content.append(list);
  }

  if (fees?.enabled) cards("fees", fees.heading || "Fees", fees.items, fee => {
    const amount = new Intl.NumberFormat("en-AU", { style: "currency", currency: fee.currency || "AUD" }).format(fee.amount);
    return card(fee.label, fee.unit ? amount + " per " + fee.unit : amount);
  });

  if (timetable?.enabled) cards("timetable", timetable.heading || "Timetable", timetable.items, session => {
    return card(session.subject, [session.day, [session.startTime, session.endTime].filter(Boolean).join("–")].filter(Boolean).join(" · "));
  });

  if (testimonials?.enabled) cards("testimonials", testimonials.heading || "Testimonials", testimonials.items, item => {
    const quote = element("figure", null, "card");
    quote.append(element("blockquote", item.quote));
    appendText(quote, "figcaption", item.author);
    return quote;
  });

  if (actions.length) {
    const content = section("enquiries", enquiries.heading || "Enquiries", "contact");
    const copy = element("div", null, "contact-copy");
    copy.append(content.querySelector("h2"));
    appendText(copy, "p", enquiries.description);
    const links = element("div", null, "contact-links");
    for (const action of actions) links.append(link(action.label, action.href, "button"));
    content.append(copy, links);
  }

  const sections = [
    ["subjects", "Subjects"],
    ["tutors", tutors.length === 1 ? "Meet the Tutor" : "Meet the Tutors"],
    ["details", "Class Details"]
  ];
  for (const [id, label] of sections) {
    if (document.getElementById(id)) navigation.append(link(label, "#" + id));
  }
  menu.hidden = !navigation.childElementCount;
  if (actions.length) {
    mobileEnquire.hidden = false;
    navigation.append(link("Enquire", "#enquiries", "header-enquire desktop-enquire button"));
  }
  brand.closest("header").hidden = false;

  const footer = element("footer", null, "footer");
  const footerContent = element("div", null, "shell footer-inner");
  footerContent.append(element("strong", site.name), link("Back to top", "#brand"));
  footer.append(footerContent);
  document.body.append(footer);
}

menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") !== "true"));
navigation.addEventListener("click", event => {
  const target = event.target.closest("a");
  if (!target) return;
  if (menu.getAttribute("aria-expanded") === "true") {
    const heading = document.querySelector(target.hash + " h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
  setMenu(false);
});
mobileEnquire.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});

async function loadSite() {
  try {
    const response = await fetch("./site.json");
    if (!response.ok) throw new Error("Configuration could not be loaded");
    render(await response.json());
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  } catch (error) {
    console.error(error);
    const message = location.protocol === "file:"
      ? "Open this page through a local web server to load site.json."
      : "The tuition details are currently unavailable.";
    const status = element("p", message, "shell section");
    status.setAttribute("role", "status");
    main.replaceChildren(status);
  }
}

loadSite();
