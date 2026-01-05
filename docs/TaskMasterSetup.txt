https://pageai.pro/blog/claude-code-taskmaster-ai-tutorial


What you'll learn

In this tutorial, I'll show you how to set yourself up for success when coding with AI in Claude Code.
So what is it? The backbone of this approach is a MCP server that you can run in Claude Code and a handful of prompts needed to use it. This MCP server helps you manage tasks that the AI can work on.

We'll cover:

    Writing requirements
    Creating a PRD file (and prompts)
    Setting up the task management system via MCP in Claude Code
    Coding the app (prompts and task management)

Finally, we'll look at using this system to also solve complex bugs (introduced by either you or the AI).

1. Writing requirements

Obviously, the AI doesn't know what you want build. Ideally, you'll spend 10-15 minutes on this step, writing as much detail as possible about the app you have in mind.

Be sure to include:

    App name
    Tech stack
    Core features
    Database
    API integrations
    Design style
    Things that you don't want to build
    Ask it to research a comparable, existing app (if applicable)

We then take these and head over to Anthropic Console (Claude Sonnet 3.7 or better recommended) and ask it to:

    I would like to create concise functional requirements for the following application:
    ...
    Output as markdown code.

## Here is a complete example:

```
I would like to create concise functional requirements for the following application:

The app is called Spamoose and is a Email spam detection tool where you can paste a subject + email and get a spam score.

The target audience is Small business owners, digital marketers, IT professionals, email service providers, and individuals concerned about email security.

My Requirements:
- There is already a codebase setup using Next.js 15, TailwindCSS, Lucide Icons, React Hook Form with zod and Shadcn UI (mark it as done)

- It is Integrating mailauth, node-spamd, dnsbl, simple regex heuristics.
- Comprehensive spam detection using advanced algorithms and heuristics.
- Real-time analysis providing immediate feedback on email content.
- User-friendly interface with a clear 0-100 risk score and color-coded badges for easy understanding.
- Detailed breakdown of spam score factors with actionable tips for improvement.
- Integration with popular email authentication and spam detection tools for enhanced accuracy.
- The app should have a unified interface with an input for a subject on one for the email body
- It should render that on the left, and a preview on the right (supports HTML email)
- It should remember your last email (saved to local storage)
- It should use framer-motion for delightful animations and effects
- You should see actionable actions points


Advanced features:
- There should be a paywall to autofix the email that calls a nextjs openai /api route, where the action points are sent and a modified email with a better spam score is returned
- You should pay $5 to unlock for 24h. The payment integration should be done via Polar.
- You should get a license that gets automatically written to local storage. The license should have an expiry date and based on that know when to charge the $5 again.


Output as markdown code.
```



## The output will look like this:

```
# Spamoose - Email Spam Detection Tool
## Functional Requirements

### Core Setup
- [x] **Development Stack**: Next.js 15, TailwindCSS, Lucide Icons, React Hook Form with Zod validation, Shadcn UI components

### Core Features

#### 1. Spam Detection Engine
- [ ] **Multi-layered Detection**: Integrate mailauth, node-spamd, DNSBL, and regex heuristics
- [ ] **Advanced Algorithms**: Implement comprehensive spam detection using multiple analysis methods
- [ ] **Real-time Processing**: Provide immediate feedback upon email submission
- [ ] **Score Calculation**: Generate unified 0-100 risk score from all detection methods

#### 2. User Interface
- [ ] **Dual Input Interface**:
  - Subject line input field
  - Email body textarea (unified interface)
- [ ] **Split Layout**:
  - Left panel: Input forms and controls
  - Right panel: Email preview with HTML rendering support
- [ ] **Visual Feedback**: Color-coded badges and indicators for spam risk levels
- [ ] **Animation System**: Implement Framer Motion for smooth transitions and micro-interactions

#### 3. Analysis & Feedback
- [ ] **Risk Score Display**: Clear 0-100 numerical score with color coding
- [ ] **Factor Breakdown**: Detailed analysis showing which elements triggered spam detection
- [ ] **Actionable Insights**: Generate specific improvement recommendations based on analysis results
- [ ] **Progress Indicators**: Show analysis progress during processing

#### 4. Data Persistence
- [ ] **Local Storage**: Save user's last email content (subject + body) to localStorage
- [ ] **Session Restoration**: Automatically restore previous email on page reload
- [ ] **License Management**: Store and validate premium license in localStorage

### Premium Features

#### 5. AI Email Optimization
- [ ] **Paywall Integration**: Restrict auto-fix feature behind payment wall
- [ ] **OpenAI API Route**: Create `/api/autofix` endpoint for email optimization
- [ ] **Smart Corrections**: Send action points to AI and receive optimized email content
- [ ] **Before/After Comparison**: Show original vs. optimized email with score improvements

#### 6. Payment & Licensing System
- [ ] **Polar Integration**: Implement $5 payment processing via Polar
- [ ] **24-Hour License**: Generate time-based license valid for 24 hours post-payment
- [ ] **Auto-Expiry**: Automatically detect license expiration and prompt for renewal
- [ ] **License Validation**: Check license status before allowing premium features
- [ ] **Payment Flow**: Seamless checkout experience with immediate feature unlock

### Technical Requirements

#### 7. API Integration
- [ ] **Mailauth Integration**: Email authentication validation
- [ ] **Node-spamd Integration**: SpamAssassin daemon integration
- [ ] **DNSBL Checks**: DNS-based blacklist verification
- [ ] **Regex Heuristics**: Pattern-based spam detection rules

#### 8. Performance & UX
- [ ] **Loading States**: Smooth loading indicators during analysis
- [ ] **Error Handling**: Graceful error messages and fallback states
- [ ] **Responsive Design**: Mobile-friendly interface across all screen sizes
- [ ] **Accessibility**: WCAG compliant interface with proper ARIA labels

### User Journey
1. User pastes subject line and email content
2. System performs real-time spam analysis
3. Results display with score, breakdown, and action points
4. User can view HTML preview of email
5. For premium users: Access AI-powered email optimization
6. Results and inputs persist in browser for future sessions

### Success Metrics
- Accurate spam detection across multiple vectors
- Intuitive user experience with clear actionable feedback
- Seamless premium feature integration with payment processing
- High user retention through localStorage persistence
```

Go through these in detail and ensure there's nothing in there that you don't want.
Keep it as precise as possible.

Next, we'll take this output and create a complete Product Requirements Document.
This will be the input of the task management system.

2. Creating a PRD file (and prompts)

A good PRD file is key to the process. It helps the task management system break down tasks, analyze complexity and understand dependencies between tasks.

Unfortunately, most people don't want to share this prompt. If you nail this, you got the secret sauce to olympic-level vibe coding. Those people can shove it.

Let me show you. Open up Claude / Anthropic Console, select the claude-3.7-sonnet or model or newer and use this prompt to create a PRD file:

```
You are an expert technical product manager specializing in feature development and creating comprehensive product requirements documents (PRDs). Your task is to generate a detailed and well-structured PRD based on the following instructions:

<prd_instructions>
{{PRD_INSTRUCTIONS}}
</prd_instructions>

Follow these steps to create the PRD:

1. Begin with a brief overview explaining the project and the purpose of the document.

2. Use sentence case for all headings except for the title of the document, which should be in title case.

3. Organize your PRD into the following sections:
   a. Introduction
   b. Product Overview
   c. Goals and Objectives
   d. Target Audience
   e. Features and Requirements
   f. User Stories and Acceptance Criteria
   g. Technical Requirements / Stack
   h. Design and User Interface

4. For each section, provide detailed and relevant information based on the PRD instructions. Ensure that you:
   - Use clear and concise language
   - Provide specific details and metrics where required
   - Maintain consistency throughout the document
   - Address all points mentioned in each section

5. When creating user stories and acceptance criteria:
   - List ALL necessary user stories including primary, alternative, and edge-case scenarios
   - Assign a unique requirement ID (e.g., ST-101) to each user story for direct traceability
   - Include at least one user story specifically for secure access or authentication if the application requires user identification
   - Include at least one user story specifically for Database modelling if the application requires a database
   - Ensure no potential user interaction is omitted
   - Make sure each user story is testable

6. Format your PRD professionally:
   - Use consistent styles
   - Include numbered sections and subsections
   - Use bullet points and tables where appropriate to improve readability
   - Ensure proper spacing and alignment throughout the document

7. Review your PRD to ensure all aspects of the project are covered comprehensively and that there are no contradictions or ambiguities.

Present your final PRD within <PRD> tags. Begin with the title of the document in title case, followed by each section with its corresponding content. Use appropriate subheadings within each section as needed.

Remember to tailor the content to the specific project described in the PRD instructions, providing detailed and relevant information for each section based on the given context.
```

Obviously, remember to replace {{PRD_INSTRUCTIONS}} with the output markdown from the previous step.

    This is made for Claude, but should work with other LLMs too (I haven't tested it).

The output will look like this:

```
# Spamoose - Email Spam Detection Tool Product Requirements Document

## 1. Introduction

This Product Requirements Document (PRD) outlines the comprehensive requirements for Spamoose, an advanced email spam detection tool designed to help users identify and optimize their email content to avoid spam filters. This document serves as the primary reference for development teams, stakeholders, and quality assurance to ensure successful product delivery.

The document covers all functional and technical requirements, user stories, acceptance criteria, and implementation details necessary to build a robust email spam detection platform with premium AI-powered optimization features.

## 2. Product overview

Spamoose is a web-based email spam detection tool that provides real-time analysis of email content using multiple detection methods including mailauth, node-spamd, DNSBL, and regex heuristics. The platform features a dual-panel interface where users can input their email subject and body content, receive immediate spam risk assessment with actionable insights, and access premium AI-powered email optimization features.

The tool generates a unified 0-100 risk score, provides detailed factor breakdowns, and offers specific improvement recommendations. Premium users can access AI-powered auto-fix functionality that optimizes their email content to reduce spam risk scores.

### Key value propositions:
- Multi-layered spam detection with comprehensive analysis
- Real-time feedback with actionable insights
- Premium AI-powered email optimization
- Persistent data storage for improved user experience
- Mobile-responsive design with smooth animations

## 3. Goals and objectives

### Primary goals:
- Provide accurate spam detection across multiple analysis vectors
- Deliver intuitive user experience with clear, actionable feedback
- Implement seamless premium feature integration with payment processing
- Ensure high user retention through localStorage persistence and valuable insights

### Success metrics:
- Spam detection accuracy rate: >95% across all detection methods
- User session duration: Average >5 minutes
- Premium conversion rate: >8% of active users
- User retention rate: >60% return within 7 days
- Mobile responsiveness: 100% functionality across devices

### Technical objectives:
- Real-time processing with <3 second response times
- 99.9% uptime reliability
- WCAG 2.1 AA accessibility compliance
- Secure payment processing with PCI compliance

## 4. Target audience

### Primary users:
- **Email marketers**: Professionals managing email campaigns who need to ensure deliverability
- **Small business owners**: Entrepreneurs sending promotional emails to customers
- **Content creators**: Bloggers and newsletter writers optimizing their email content
- **Sales professionals**: Individual contributors sending outreach emails

### Secondary users:
- **Marketing agencies**: Teams managing multiple client email campaigns
- **E-commerce businesses**: Online retailers sending transactional and promotional emails
- **SaaS companies**: Businesses sending product updates and onboarding emails

### User characteristics:
- Technical proficiency: Beginner to intermediate
- Email frequency: 5-50 emails per week
- Budget range: $5-50/month for email optimization tools
- Primary pain points: Email deliverability, spam filter avoidance, inbox placement

## 5. Features and requirements

### 5.1 Core features

#### Spam detection engine
- Multi-layered detection using mailauth, node-spamd, DNSBL, and regex heuristics
- Advanced algorithms with comprehensive spam analysis methods
- Real-time processing with immediate feedback
- Unified 0-100 risk score calculation from all detection methods

#### User interface
- Dual input interface with subject line and email body fields
- Split layout with left panel for inputs and right panel for email preview
- HTML rendering support for email preview
- Color-coded badges and risk level indicators
- Framer Motion animations for smooth transitions

#### Analysis and feedback
- Clear 0-100 numerical score with color coding
- Detailed factor breakdown showing triggering elements
- Actionable insights with specific improvement recommendations
- Progress indicators during analysis processing

#### Data persistence
- localStorage integration for email content persistence
- Session restoration functionality
- Premium license management and validation

### 5.2 Premium features

#### AI email optimization
- Paywall integration restricting auto-fix feature
- OpenAI API integration via `/api/autofix` endpoint
- Smart corrections based on analysis action points
- Before/after comparison with score improvements

#### Payment and licensing system
- Polar integration for $5 payment processing
- 24-hour time-based license generation
- Automatic license expiration detection
- License validation for premium features
- Seamless checkout experience with immediate unlock

## 6. User stories and acceptance criteria

### 6.1 Core functionality user stories

**ST-101: Email content input**
- **User story**: As a user, I want to input my email subject line and body content so that I can analyze my email for spam risk
- **Acceptance criteria**:
  - Subject line input field accepts up to 200 characters
  - Email body textarea accepts up to 10,000 characters
  - Real-time character count display
  - Input validation with error messages
  - Auto-save to localStorage every 5 seconds

**ST-102: Spam analysis processing**
- **User story**: As a user, I want to receive real-time spam analysis so that I can understand my email's spam risk
- **Acceptance criteria**:
  - Analysis completes within 3 seconds
  - Progress indicator shows processing status
  - All four detection methods (mailauth, node-spamd, DNSBL, regex) execute
  - Unified 0-100 score calculation
  - Error handling for failed analysis attempts

**ST-103: Results display**
- **User story**: As a user, I want to see my spam risk score and detailed breakdown so that I can understand what needs improvement
- **Acceptance criteria**:
  - Risk score displays with color coding (0-30 green, 31-70 yellow, 71-100 red)
  - Factor breakdown shows all triggering elements
  - Actionable insights provide specific recommendations
  - Results update in real-time as content changes

**ST-104: Email preview**
- **User story**: As a user, I want to preview how my email will look so that I can assess its visual impact
- **Acceptance criteria**:
  - HTML rendering support for formatted emails
  - Responsive preview adjusts to different screen sizes
  - Plain text fallback for non-HTML content
  - Toggle between HTML and plain text views

**ST-105: Data persistence**
- **User story**: As a user, I want my email content to be saved so that I don't lose my work between sessions
- **Acceptance criteria**:
  - Email content saves to localStorage automatically
  - Content restores on page reload
  - Clear option to delete saved content
  - Storage quota management with user notification

### 6.2 Premium feature user stories

**ST-201: Payment processing**
- **User story**: As a user, I want to purchase premium access so that I can use AI optimization features
- **Acceptance criteria**:
  - Polar payment integration processes $5 transactions
  - Secure payment flow with PCI compliance
  - Immediate license generation after successful payment
  - Payment confirmation email sent to user

**ST-202: License management**
- **User story**: As a premium user, I want my license to be validated so that I can access premium features
- **Acceptance criteria**:
  - 24-hour license duration from purchase time
  - License validation checks before premium feature access
  - Automatic expiration detection and user notification
  - License renewal prompts before expiration

**ST-203: AI email optimization**
- **User story**: As a premium user, I want AI-powered email optimization so that I can automatically improve my email content
- **Acceptance criteria**:
  - OpenAI API integration generates optimized content
  - Before/after comparison shows improvements
  - Score improvement calculation and display
  - Option to accept or reject AI suggestions

**ST-204: Premium paywall**
- **User story**: As a free user, I want to see premium features so that I understand the value proposition
- **Acceptance criteria**:
  - Paywall blocks access to AI optimization
  - Clear premium feature benefits display
  - Direct link to payment flow
  - Premium feature preview or demo

### 6.3 Technical user stories

**ST-301: API integration**
- **User story**: As a system, I need to integrate with multiple spam detection services so that I can provide comprehensive analysis
- **Acceptance criteria**:
  - Mailauth integration for email authentication
  - Node-spamd integration for SpamAssassin analysis
  - DNSBL checks for blacklist verification
  - Regex heuristics for pattern-based detection
  - Fallback handling for service unavailability

**ST-302: Performance optimization**
- **User story**: As a user, I want fast response times so that I can efficiently analyze my emails
- **Acceptance criteria**:
  - Page load time under 2 seconds
  - Analysis processing under 3 seconds
  - Smooth animations at 60fps
  - Optimized API calls with caching

**ST-303: Error handling**
- **User story**: As a user, I want clear error messages so that I can understand and resolve issues
- **Acceptance criteria**:
  - User-friendly error messages for all failure scenarios
  - Retry mechanisms for transient failures
  - Graceful degradation when services are unavailable
  - Error logging for debugging purposes

**ST-304: Accessibility compliance**
- **User story**: As a user with disabilities, I want accessible interface so that I can use the tool effectively
- **Acceptance criteria**:
  - WCAG 2.1 AA compliance
  - Keyboard navigation support
  - Screen reader compatibility
  - High contrast color schemes
  - Proper ARIA labels and descriptions

### 6.4 Mobile and responsive user stories

**ST-401: Mobile responsiveness**
- **User story**: As a mobile user, I want full functionality on my device so that I can use the tool anywhere
- **Acceptance criteria**:
  - Responsive design works on screens 320px and above
  - Touch-friendly interface elements
  - Optimized layouts for portrait and landscape modes
  - Mobile-specific performance optimizations

**ST-402: Progressive web app features**
- **User story**: As a frequent user, I want app-like experience so that I can access the tool quickly
- **Acceptance criteria**:
  - PWA manifest for home screen installation
  - Service worker for offline capability
  - Push notifications for license expiration
  - App-like navigation and interactions

## 7. Technical requirements / Stack

### 7.1 Frontend technology stack
- **Framework**: Next.js 15 with App Router
- **Styling**: TailwindCSS for responsive design
- **Icons**: Lucide Icons for consistent iconography
- **Forms**: React Hook Form with Zod validation
- **UI Components**: Shadcn UI component library
- **Animations**: Framer Motion for smooth transitions
- **State Management**: React Context API and localStorage

### 7.2 Backend and API requirements
- **Runtime**: Node.js 18+ with TypeScript
- **API Routes**: Next.js API routes for server-side logic
- **External APIs**: OpenAI API for email optimization
- **Payment Processing**: Polar API for subscription management
- **Spam Detection**: mailauth, node-spamd, DNSBL, regex libraries

### 7.3 Data storage and persistence
- **Client Storage**: localStorage for user data and license
- **Session Management**: Next.js built-in session handling
- **Cache Strategy**: API response caching with TTL
- **Data Validation**: Zod schemas for all data structures

### 7.4 Security requirements
- **API Security**: Rate limiting and input validation
- **Payment Security**: PCI DSS compliance via Polar
- **Data Protection**: Client-side encryption for sensitive data
- **CORS Configuration**: Proper cross-origin resource sharing

### 7.5 Performance requirements
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Bundle Size**: Initial bundle <250KB gzipped
- **API Response Time**: <3 seconds for spam analysis
- **Uptime**: 99.9% availability target

### 7.6 Deployment and infrastructure
- **Hosting**: Vercel for Next.js deployment
- **CDN**: Automatic edge caching via Vercel
- **Environment Management**: Separate staging and production
- **Monitoring**: Error tracking and performance monitoring

## 8. Design and user interface

### 8.1 Design principles
- **Clarity**: Clear visual hierarchy with intuitive information architecture
- **Efficiency**: Streamlined workflows with minimal clicks to completion
- **Accessibility**: WCAG 2.1 AA compliant design patterns
- **Consistency**: Unified design system across all interfaces
- **Responsiveness**: Mobile-first approach with progressive enhancement

### 8.2 Layout and navigation
- **Split-panel layout**: Left panel for inputs and controls, right panel for preview
- **Responsive breakpoints**: Mobile (<768px), tablet (768px-1024px), desktop (>1024px)
- **Navigation**: Header with logo, pricing, and help links
- **Footer**: Terms, privacy, and contact information

### 8.3 Color scheme and branding
- **Primary colors**: Blue (#2563eb) for actions, green (#16a34a) for success
- **Status colors**: Red (#dc2626) for high risk, yellow (#ca8a04) for medium risk
- **Neutral colors**: Gray scale for backgrounds and secondary content
- **Accessibility**: Minimum 4.5:1 contrast ratio for all text

### 8.4 Typography and spacing
- **Font system**: Inter font family for readability
- **Type scale**: 12px to 48px with consistent line heights
- **Spacing system**: 4px base unit with 8px, 16px, 24px, 32px increments
- **Grid system**: 12-column grid with responsive gutters

### 8.5 Interactive elements
- **Buttons**: Primary, secondary, and ghost variants with hover states
- **Forms**: Floating labels with inline validation
- **Feedback**: Loading spinners, progress bars, and status indicators
- **Animations**: Subtle micro-interactions with 200-300ms duration

### 8.6 Component specifications
- **Input fields**: Rounded corners, focus states, error styling
- **Cards**: Elevated surfaces with subtle shadows
- **Badges**: Pill-shaped indicators with appropriate colors
- **Modals**: Overlay dialogs with backdrop and escape handling

### 8.7 Responsive behavior
- **Mobile**: Single-column layout with collapsible panels
- **Tablet**: Compact two-column layout with adjusted spacing
- **Desktop**: Full split-panel layout with maximum content width
- **Touch targets**: Minimum 44px for mobile interaction areas
```

Similar to the previous step, go through the output and make sure there's nothing in there that you don't want.

Next, we'll use this PRD to generate tasks, subtasks, analyze complexity and set up dependencies between tasks.
(optional) Prepping codebase

If you're doing this on an existing codebase, you can just skip this step.

I'd highly recommend that before you proceed with the next step, you set up a codebase. Don't start from scratch!

⚠️ Be warned!

Do NOT start from an empty codebase. There will be dragons 🐲. And mostly, lots of tokens wasted for a wonky foundation. Use a CLI, your favorite template or just use PageAI, but whatever you do, do not let Claude Code bootstrap your codebase.

Here's what you need to have set up at a minimum:

Feature	Recommended
Framework	Next.js
UI components	React/Shadcn UI
Type checks	TypeScript
Linter	ESLint
Formatter	Prettier
CSS library	TailwindCSS (AI is just better with it)
State management	Zustand

If you plan to use any database or some sort of API, make sure to also have those set up.
Also, I always add Sentry when I kick off a new project. I just sleep better that way.

3. Setting up the task management system via MCP in Claude Code

In this step, we'll set up the task management system via MCP in Claude Code.
3.1 Difference between Taskmaster AI and Claude Code Plan mode

These days, there are a handful of tools that help with AI task management. You might even ask yourself: "Why not just use Claude Code's built-in plan mode?"

Plan mode is only useful for one task at a time. It doesn't keep track of dependencies between tasks and doesn't maintain overall context. TaskMaster AI can help you build entire projects, not just one task. It can also break down complex tasks into smaller, more manageable subtasks. You can also use it later for context whenever you /clear the context. In other words, it's managing tasks on a higher level than plan mode and is a better tool to manage complexity as your codebase grows.
3.2 Installing Taskmaster AI MCP in Claude Code

Taskmaster AI has a CLI and is platform/text editor independent. However, it also has excellent support for Claude Code through its MCP server.
The MCP server integration in Claude Code is particularly smooth because Claude Code has native MCP support, meaning you don't need to switch context to a different window.
So let's set up the Taskmaster AI MCP server in Claude Code.

Claude Code makes setting up MCP servers straightforward. You'll need to configure the TaskMaster AI server in your Claude Code settings.

First, create a .taskmaster/config.json file in your project root:

```
{
  "models": {
    "main": {
      "provider": "claude-code",
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.2
    },
    "research": {
      "provider": "claude-code",
      "modelId": "opus",
      "maxTokens": 32000,
      "temperature": 0.1
    },
    "fallback": {
      "provider": "claude-code",
      "modelId": "sonnet",
      "maxTokens": 64000,
      "temperature": 0.2
    }
  },
  "global": {
    "logLevel": "info",
    "debug": false,
    "defaultSubtasks": 5,
    "defaultPriority": "medium",
    "projectName": "Task Master",
    "ollamaBaseURL": "http://localhost:11434/api",
    "bedrockBaseURL": "https://bedrock.us-east-1.amazonaws.com",
    "userId": "1234567890",
    "defaultTag": "master"
  }
}
```

Then configure Claude Code to use the TaskMaster AI MCP server. In Claude Code, the MCP server will be automatically available once properly configured.

You need to add the following to your .mcp.json file, at the root of your project:

```
{
  "mcpServers": {
    "taskmaster-ai": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "--package=task-master-ai", "task-master-ai"],
      "env": {}
    },
  }
}
```

Important Claude Code Advantage: All requests made from TaskMaster AI will go through your Claude Code subscription. This means you get this functionality without any extra token costs - it's effectively free as part of your Claude Code usage!

3.3 Setting up Claude Code Rules (optional)

Remember! Claude Code has its own way of managing project context through the CLAUDE.md file. Here are some things you should cover in your CLAUDE.md:

    tech stack and versions of libraries
    overall project structure (explaining folder names)
    naming conventions
    style/language preferences
    UI coding preferences

This will ensure Claude Code understands your project conventions from the start.
3.4 Initializing TaskMaster AI in Claude Code

    Before getting into this make sure to:

        Have Claude Code open with your project
        Ensure the MCP server is properly configured

Now that we have the MCP server & codebase set up, we can initialize TaskMaster AI.

    Paste the PRD output from above into a new file under scripts/prd.txt.

    In Claude Code, use the following prompt:

    ```
    I've initialized a new project with Claude Task Master. I have a PRD at scripts/prd.txt.
Can you parse it and set up initial tasks?
```
This will transform your PRD file into a series of files (under /tasks), plus a /tasks/tasks.json file that contains a structured list of tasks, subtasks and metadata.

    These are not added to Git by default, but I recommend that you do. Just in case the AI goes rogue.

Important: Claude Code JSON Parsing Workaround

⚠️ Known Issue: Claude Code may encounter a JSON parsing error when trying to parse the PRD file directly:

```
taskmaster-ai:parse_prd (MCP) Error: Claude Code API error during object generation:
Unterminated string in JSON at position 14000 (line 1 column 14001)
```

Workaround: If you encounter this error, you'll need to use a two-step approach:

    First, use Cursor (or another AI coding tool) to generate the initial tasks from your PRD
    Then switch back to Claude Code and continue with the task implementation

This is a temporary limitation that may be resolved in future updates of TaskMaster AI or Claude Code.

    Analyze Complexity. Now, we will ask Taskmaster AI to analyze the complexity of the tasks. This will help identify which tasks need to be broken down further.

```
Can you analyze the complexity of our tasks to help me understand which ones need to be broken down further?
```

The response will show complexity scores and recommendations.

You can reply with Can you help me break down all of the high complexity tasks? and it will do just that. Remember to say please 😅

Further breaking down tasks.

It is also possible to break down individual tasks if you see some that are too complex.
Ideally, you'd break down tasks in units that seem easy to implement to you as a human. If something seems complex to you, it'll probably be complex for the AI too.

```
Task 3 seems complex. Can you break it down into subtasks?
```

And that's the setup! You can continue to break down tasks as needed.
If you missed something, don't worry. You can always add tasks later or change direction in the implementation.

Here are some prompt recipes you can use:

    add a new task

        Let's add a new task. We should implement sorting of the timeline.
        Here are the requirements:

        - you should be able to sort the timeline by date
        - a dropdown should be available to select the sorting direction
        - the sorting should be persisted when a new page is loaded

    change direction of a task

        There should be a change in the image generation task.
        Can you update task 3 with this and set it back to pending?

        The image generation should use gpt-image-1 as the model.

    deprecate a task

        Task 8 is not needed anymore. You can remove it.

Now, let's build! (or I should say, let's watch the AI build!)

4. Building the app (prompt loop)

With all this setup done, we are 110% percent ready to let go of the wheel and let the AI do its thing.

This is also the easiest part! Here's what I ended up building:
Spamoose.com

So, without further ado, here's how you can build something like this too:

    In Claude Code, prompt it:

    Show tasks

    This will show you the tasks in a list and ensure Claude Code is aware of the tasks and their statuses.

    Then, prompt it:

    What's the next task I should work on? Please consider dependencies and priorities.

    This will pick the next task based on dependencies and priority.

    Implement the task.

    Implement task 2 and all of its subtasks.

        Depending on the complexity of the task, you might want to only tell it to implement a single subtask, e.g. Implement subtask 2.1.

    Iterate.

    After implementing the task, do a smoke test of the UI/app. If it looks good, continue with:

    Show tasks

    What's the next task I should work on? Please consider dependencies and priorities.

    Implement task X

And that is all there is to it!
One by one, you'll see the app come to life.

In my case, I started with 15 tasks and ended up with 19.
The app turned out to be pretty impressive.

It's a neat & fun little app, isn't it?!
It was mostly smooth to build, but I still hit some bugs along the way. This is not my first AI rodeo, so I will share some pro tips below on how to get the most out of it.
Claude Code Specific Advantages

Using TaskMaster AI with Claude Code has several unique benefits:
Advantage	Description
No Extra Token Costs	All TaskMaster AI requests use your Claude Code subscription tokens
Native MCP Support	Claude Code has built-in MCP server support, making integration seamless
Extended Context	Claude Code's larger context window helps with complex tasks
Better Error Recovery	Claude Code's thinking capabilities help it recover from errors more gracefully
Integrated Environment	No need to switch between windows - everything happens in Claude Code
Thoughts

Let me be honest with you about AI coding.
It's as good as you make it.

All those videos showing AI magically creating perfect apps? They are making it look too easy.

While TaskMaster AI systematically breaks tasks down into small increments (which is way better than trying to one-shot an entire complex system), you still need to stay engaged.

You still need to do the architecture, design, and testing.
Plus, a good grasp of technology and the ability to debug is still required.

You simply cannot let AI complete task after task without checking what it's doing and steering it in the right direction when needed.
You gotta think!

But darn, you can build some cool things with it. I'm impressed!
Pro tips
1. You can still add extra context to each task run

When prompting the AI to work on the next task, ensure to provide additional context on e.g. UI preferences, API docs etc. You can also attach images!

This will guide it on the path you want to go.
2. Break down files that are larger than 500 lines

AI is not great at handling large files. So if you have a file that is larger than 500 lines, break it down into smaller files.

Here's a prompt you can use:

Break down this file into logical modules so it's easier to read.
Create directories if needed and move utils and interfaces to separate files, maintaining a domain-driven file structure.

3. Bugs are also tasks!

With a complex enough system, you will eventually run into a bug that requires a change to the underlying architecture.
AI will try to apply a superficial fix, but you'll just end up going in circles.

So what you can do is create a new task for the bug and implement it.

Here's a prompt you can use:

The filter feature is not working as expected. Create a new task to fix it:
- the filter should be case insensitive
- it should work with pagination
- it should work with the debounce

4. Remember to commit your changes

Unlike some other AI coding tools, Claude Code doesn't have automatic checkpointing. Make sure to commit your changes after completing each task to avoid losing work if something goes wrong.