// English interface texts (Spec 004 RF-114, RF-132). `Messages` is derived from this object, so
// a key missing from the Spanish dictionary fails the build.

/** A heading whose last words take the serif accent of the site's headings. */
export interface AccentHeading {
  lead: string;
  accent: string;
}

export const en = {
  nav: {
    about: 'About',
    projects: 'Projects',
    experience: 'Experience',
    testimonials: 'Testimonials',
    blog: 'Blog',
    contact: 'Contact',
    contactMe: 'Contact Me',
    language: 'Language',
  },
  footer: {
    rights: 'Marco Figueroa. All rights reserved.',
  },
  seo: {
    homeTitle: 'Marco Figueroa — Full-Stack Developer',
    homeDescription:
      "Hi, I'm Marco Figueroa — a full-stack developer working with Angular, Node.js, and Kubernetes. I build web apps and run the servers behind them.",
    defaultImageAlt: 'Marco Figueroa — Full-stack developer',
  },
  hero: {
    badge: 'Software Engineer ☦︎ SysAdmin ☦︎ DevOps',
    taglineLead: 'Systems Thinking,',
    taglineHighlight: 'Clean Code',
    taglineJoin: 'and',
    taglineAccent: 'Solutions.',
    intro:
      'Full-stack developer working with Angular, Node.js, and Kubernetes. I build web apps and run the servers behind them.',
    contactMe: 'Contact Me',
    downloadResume: 'Download Resume',
    viewResume: 'View Resume',
    followMe: 'Follow me:',
    linksSoon: 'Links coming soon.',
    photoAlt: 'Marco Figueroa, full-stack developer',
    available: 'Available for work',
    yearsExp: 'Years Exp.',
    technologies: 'Technologies I work with',
    technologiesSoon: 'Technologies coming soon.',
    scroll: 'Scroll',
  },
  about: {
    eyebrow: 'About Me',
    heading: { lead: 'From the server room,', accent: 'to the browser.' } as AccentHeading,
    paragraphs: [
      "I'm a software engineer and system administrator based in Santiago, Chile, with 3 years of experience supporting and operating critical systems — Windows, Linux, databases and TLS/SSL certificates.",
      'Today I build AI-powered solutions with Python, FastAPI, LangGraph and Next.js, and I work across the stack with Angular, Node.js and TypeScript, backed by CI/CD pipelines, Docker and Kubernetes.',
      "I enjoy understanding the whole picture: how the code is written, how it's deployed and how it keeps running in production.",
    ],
    quote:
      '"My goal is to build software that is simple to use, easy to maintain and reliable to operate."',
    highlightsSoon: 'Highlights coming soon',
    updating: "I'm updating this section. Please check back soon.",
  },
  projects: {
    eyebrow: 'Featured Work',
    heading: { lead: 'Projects that', accent: 'make an impact.' } as AccentHeading,
    intro:
      'A selection of my recent work, from web applications to the infrastructure that keeps them running.',
    viewMore: 'View more projects',
    soon: 'Projects coming soon',
    soonGithub: "I'm preparing this section. Meanwhile, take a look at my work on GitHub.",
    viewAll: 'View All Projects',
  },
  experience: {
    eyebrow: 'Career Journey',
    heading: { lead: 'Experience that', accent: 'speaks volumes.' } as AccentHeading,
    intro:
      'A timeline of my professional growth, from customer support to system administration and software development.',
    viewMore: 'View more',
    viewMoreHint: 'Full history, details and certifications',
    soon: 'Experience coming soon',
    updating: "I'm updating this section. Please check back soon.",
  },
  testimonials: {
    eyebrow: 'What People Say',
    heading: { lead: 'Kind words from', accent: 'amazing people.' } as AccentHeading,
    previous: 'Previous testimonial',
    next: 'Next testimonial',
    show: (n: number) => `Show testimonial ${n}`,
    soon: 'Testimonials coming soon',
    soonText: "Have we worked together? I'd love to hear your feedback.",
    leave: 'Leave a testimonial',
  },
  testimonialDialog: {
    titleLead: 'Leave a',
    titleAccent: 'testimonial',
    close: 'Close',
    name: 'Name',
    namePlaceholder: 'Your name...',
    nameError: 'Enter your name: up to 100 characters on one line.',
    role: 'Role',
    rolePlaceholder: 'Your role and company...',
    roleError: 'Enter your role: up to 100 characters on one line.',
    email: 'Email',
    emailPrivacy:
      'Your email is only used to contact you about this testimonial and is never published.',
    emailError: 'Enter a valid email address of up to 200 characters.',
    testimonial: 'Testimonial',
    testimonialPlaceholder: 'What was it like to work together?',
    testimonialError: 'Write your testimonial: up to 500 characters.',
    sending: 'Sending...',
    send: 'Send Testimonial',
  },
  contact: {
    eyebrow: 'Get In Touch',
    heading: { lead: "Let's build", accent: 'something great.' } as AccentHeading,
    intro:
      "Have a project or an opportunity in mind? Send me a message and let's discuss how we can work together.",
    name: 'Name',
    namePlaceholder: 'Your name...',
    email: 'Email',
    message: 'Message',
    messagePlaceholder: 'Your message...',
    sending: 'Sending...',
    send: 'Send Message',
    info: 'Contact Information',
    infoSoon: 'Contact details coming soon.',
    available: 'Currently Available',
    availableText:
      "I'm open to new opportunities in software development, system administration and DevOps. Let's talk!",
  },
  forms: {
    /** Shown when the API cannot be reached or answers without its own error text (RF-27). */
    sendError: 'Failed to send message. Please try again later.',
  },
  pages: {
    backHome: 'Back to home',
    projects: {
      seoTitle: 'Projects',
      seoDescription:
        'Every project by Marco Figueroa in depth: the problem, the architecture and what I learned.',
      eyebrow: 'All Work',
      heading: { lead: 'Every project,', accent: 'in depth.' } as AccentHeading,
      intro: 'Each card opens a full write-up: the problem, the architecture and what I learned.',
      soon: 'Projects coming soon',
      soonText: "I'm preparing this section.",
    },
    project: {
      all: 'All projects',
      live: 'Live site',
      source: 'Source code',
      contactMe: 'Contact Me',
    },
    experience: {
      seoTitle: 'Experience',
      seoDescription:
        'The full career of Marco Figueroa: every role with its stack and results, plus certifications.',
      eyebrow: 'Career Journey',
      heading: { lead: 'The full', accent: 'story.' } as AccentHeading,
      intro: 'Open any role to read what I did there, the stack and the results.',
      listLabel: 'Experience',
      current: 'Current',
      soon: 'Experience coming soon',
      updating: "I'm updating this section. Please check back soon.",
      proof: 'Proof',
      certifications: 'Certifications',
      expired: 'Expired',
      expires: 'Expires',
      issued: 'Issued',
      noExpiry: 'No expiry',
      credential: 'Credential',
      viewCertificate: 'View certificate',
      verify: 'Verify',
    },
    blog: {
      seoTitle: 'Blog',
      seoDescription: 'Write-ups by Marco Figueroa on building, deploying and running software.',
      seoTagged: (tag: string) => `Posts tagged ${tag}`,
      seoPage: (title: string, page: number) => `${title} — Page ${page}`,
      eyebrow: 'Blog',
      heading: { lead: 'Notes from', accent: 'the stack.' } as AccentHeading,
      intro: 'Write-ups on building, deploying and running software.',
      rss: 'RSS',
      filterLabel: 'Filter by tag',
      all: 'All',
      tagged: 'Posts tagged',
      pagination: 'Pagination',
      newer: 'Newer',
      older: 'Older',
      pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
      empty: 'No posts yet',
      emptyText: 'The first write-ups are on their way. Follow the RSS feed to get them.',
    },
    post: {
      all: 'All posts',
      references: 'References',
      tocLabel: 'Table of contents',
      onThisPage: 'On this page',
    },
    readingTime: (minutes: number) => `${minutes} min read`,
    notFound: {
      title: 'Page not found',
      text: 'The page you are looking for does not exist or is no longer available.',
    },
    unavailable: {
      title: 'Temporarily unavailable',
      text: 'This page could not be loaded right now. Please try again in a few minutes.',
    },
  },
  feed: {
    title: 'Marco Figueroa — Blog',
    description: 'Write-ups on building, deploying and running software.',
  },
  /** Floating assistant chat (Spec 001 RF-32). */
  assistant: {
    open: "Open Marco's assistant",
    hide: "Close Marco's assistant",
    title: "Marco's assistant",
    subtitle: "AI agent · Ask about Marco's work",
    newChat: 'New conversation',
    close: 'Close assistant',
    greeting: "Hi! I'm Marco's assistant.",
    intro: 'Ask me about his experience, projects or the technologies he works with.',
    tryAsking: 'Try asking',
    suggestions: [
      'What does Marco work on?',
      'Which technologies does he use?',
      'Is he available for work?',
    ],
    inputLabel: 'Message for the assistant',
    placeholder: "Ask about Marco's work...",
    send: 'Send message',
    hint: 'Enter to send · Shift+Enter for a new line',
    counter: (length: number, max: number) => `${length} / ${max}`,
    tooLong: (max: number) => `Messages can be up to ${max} characters.`,
    thinking: 'The assistant is thinking',
    showFull: 'Show full answer',
    retry: 'Retry',
    /** Shown instead of the agent's text for failures without one (RF-27, RF-28, plan D9). */
    errors: {
      generic: "We couldn't reach the assistant. Please try again.",
      timeout: 'The assistant took too long to answer. Please try again.',
      interrupted:
        "This message didn't get an answer because the page changed. You can send it again.",
    },
    errorLabels: {
      api: 'Agent message',
      generic: 'Connection problem',
      timeout: 'No answer',
      interrupted: 'Interrupted',
    },
  },
  /** Resume preview dialog (Spec 006 RF-26). */
  resumePreview: {
    title: "Marco Figueroa's resume",
    close: 'Close resume',
    download: 'Download',
    downloadLabel: 'Download resume as PDF',
    retry: 'Retry',
    loading: 'Loading resume...',
    page: (page: number, total: number) => `Page ${page} of ${total}`,
    /** Shown instead of the API's text (RF-27–RF-30). */
    errors: {
      notFound: 'The resume is not available right now.',
      generic: "We couldn't load the resume. Please try again.",
      timeout: 'The resume took too long to load. Please try again.',
    },
    fileName: 'Marco-Figueroa-Resume.pdf',
  },
};

export type Messages = typeof en;
