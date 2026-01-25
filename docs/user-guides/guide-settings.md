# Settings & Configuration

This guide walks you through all the settings and configuration options in Apex Assistant. Everything here is designed to help you customize the app to fit your workflow.

---

## Accessing Settings

There are two ways to get to Settings:

1. **Click the gear icon** in the top navigation bar (upper right corner)
2. **Type `/settings`** in your browser's address bar

Once you're in Settings, you'll see a sidebar on the left with different sections you can explore.

---

## General Settings

### Theme

Switch between **Light** and **Dark** mode depending on your preference. Dark mode is easier on the eyes, especially when working late at night or in low-light conditions.

### API Status

This shows whether the app is properly connected to the Claude AI service:

- **Connected** - Everything is working normally
- **Disconnected** - There's a connection issue (check your internet or contact support)

If you see "Disconnected," try refreshing the page. If the problem persists, your API key may need to be updated.

### Version Info

Displays the current version of Apex Assistant you're running. This is helpful when reporting issues or checking if you have the latest updates.

---

## Building Custom Agents

### What Are Agents?

Think of agents as **specialized assistants trained for specific tasks**. While the main assistant can help with many things, an agent focuses on doing one job really well.

For example, you might create an agent that only reviews Xactimate estimates, or one that only writes adjuster emails. Agents remember their specialized instructions every time you use them.

### Creating an Agent

1. Go to **Settings** and click **Agents** in the sidebar
2. Click the **"New Agent"** button
3. The Agent Wizard will walk you through setup:

   **Step 1: Name and Description**
   - Give your agent a clear name (e.g., "Estimate Reviewer")
   - Write a short description of what it does

   **Step 2: Custom Instructions**
   - This is the most important part
   - Write out exactly what this agent should know and do
   - Be specific about the tone, format, and rules it should follow

   **Step 3: Tool Access**
   - Choose which tools the agent can use (file reading, web search, etc.)
   - Only enable what the agent actually needs

   **Step 4: Save and Activate**
   - Review your settings and save
   - Toggle the agent to "Active" when you're ready to use it

### Example Agents You Could Create

**Estimate Reviewer**
- Reviews Xactimate estimates for common issues
- Flags missing line items or pricing concerns
- Checks for IICRC compliance

**Adjuster Email Writer**
- Drafts professional communications to adjusters
- Maintains a firm but polite tone
- Includes relevant documentation references

**Line Item Justifier**
- Creates IICRC-based justifications for disputed line items
- Cites specific standards and best practices
- Formats output ready for adjuster submission

---

## Creating Skills

### What Are Skills?

Skills are **reusable capabilities with clear inputs and outputs**. They're simpler than agents and designed for quick, repeatable tasks.

Think of the difference this way:
- **Agent** = A specialized assistant you have a conversation with
- **Skill** = A single action that takes input and produces output

### Built-in Templates

Apex Assistant comes with several skill templates you can use right away:

| Template | What It Does |
|----------|--------------|
| **PDF Extractor** | Pulls text and data from PDF files (like estimates or invoices) |
| **Email Drafter** | Generates professional emails based on your input |
| **Line Item Lookup** | Researches justifications for specific line items |
| **Web Research** | Gathers information from websites on a given topic |

### Creating Custom Skills

1. Go to **Settings** and click **Skills** in the sidebar
2. Click **"New Skill"** and choose:
   - Start from a template (recommended for beginners)
   - Create a blank skill from scratch

3. Configure your skill:

   **Input Type**
   - What the skill receives: text, a file, a number, etc.
   - Example: A PDF file for extraction

   **Output Type**
   - What the skill produces: text, formatted data (JSON), a file, etc.
   - Example: A text summary of the PDF contents

   **Instructions**
   - Tell the skill exactly how to process the input
   - Be specific about the format and content you want back

4. Save your skill and test it to make sure it works as expected

---

## MCP Servers (Advanced)

This section is for more advanced users who want to connect external tools and services.

### What Is MCP?

**Model Context Protocol (MCP)** is a way to connect the AI assistant to external tools and services. This lets the assistant do things like access databases, connect to other software, or use specialized tools.

You probably won't need to configure this yourself, but it's here if you do.

### Adding an MCP Server

1. Go to **Settings** and click **MCP Servers** in the sidebar
2. Click **"Add Server"**
3. Choose the connection type:

   | Type | Use For |
   |------|---------|
   | **stdio** | Local programs installed on your computer |
   | **SSE/HTTP** | Web-based services and APIs |

4. Fill in the connection details (usually provided by whoever set up the tool)
5. Click **Test Connection** to verify it works
6. Enable the server when ready

### Status Indicators

Each MCP server shows a status light:

- **Green** - Connected and working
- **Red** - Disconnected (check configuration)
- **Yellow** - Currently connecting
- **Warning symbol** - Error occurred (hover for details)

---

## Analytics & Insights

The Analytics section helps you understand how you're using the assistant and where you might save more time.

### View Your Usage

See key metrics about your activity:

- **Total Tasks Completed** - How many things the assistant has helped with
- **Success Rate** - Percentage of tasks completed successfully
- **Average Completion Time** - How long tasks typically take
- **Tasks by Category** - Breakdown of what types of work you're doing

### Automation Opportunities

This is one of the most valuable features. The system watches for patterns in your work and makes suggestions:

- **Identifies repetitive tasks** - Things you ask for over and over
- **Suggests new agents or skills** - Custom tools that could handle these tasks automatically
- **Shows potential time savings** - How much time you could save by automating

Check this section regularly to find new ways to streamline your workflow.

---

## Documentation / Learn

The Learn section is your built-in help center.

### What You'll Find Here

- **Getting Started Guides** - Step-by-step walkthroughs for new users
- **Feature Explanations** - Detailed information about each feature
- **Best Practices** - Tips for getting the most out of the assistant
- **Searchable Knowledge Base** - Find answers to specific questions

Use the search bar to quickly find what you need, or browse by category.

---

## Tips for Getting the Most Out of Settings

1. **Start with the built-in skill templates**
   Don't create everything from scratch. The templates give you a solid starting point.

2. **Create agents for tasks you do repeatedly**
   If you write the same type of email or review the same type of document often, an agent can save you significant time.

3. **Check analytics regularly**
   The automation opportunities section often reveals patterns you might not notice yourself.

4. **Use dark mode for late-night work**
   Your eyes will thank you. The toggle is in General Settings.

5. **Test before you rely on it**
   When creating a new agent or skill, run a few test cases before using it for important work.

---

## Need Help?

If something isn't working right or you have questions:

1. Check the **Learn** section for documentation
2. Look for the status indicators to diagnose connection issues
3. Try refreshing the page if things seem stuck

For issues not covered in the documentation, make note of any error messages you see and contact support.
