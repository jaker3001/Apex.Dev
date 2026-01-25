# Jobs Management

This guide covers everything you need to know about managing your restoration jobs in Apex Assistant.

---

## Overview

In Apex Assistant, **Jobs** are your restoration projects. Whether you are handling water damage, fire cleanup, mold remediation, or reconstruction, every project gets tracked as a job. Think of the Jobs section as your central hub where all project information lives - client details, insurance info, estimates, payments, labor, and more.

Each job has a unique job number, a status that shows where it stands, and tabs that organize different aspects of the work. From initial lead to final invoice, everything about a project is tracked in one place.

---

## The Jobs Page

### Getting There

Click **Jobs** in the top navigation bar to open the Jobs page.

### What You Will See

**Stats Row** - At the top, four cards show you counts at a glance:
- **Active** - Jobs currently in progress
- **Pending** - Approved jobs waiting to start
- **Leads** - New inquiries not yet confirmed
- **Complete** - Finished jobs

**Search Bar** - Type to find jobs instantly. You can search by:
- Job number (e.g., 202601-001-MIT)
- Client name
- Property address
- Insurance claim number

**Job Cards** - Jobs are grouped by status. Each card shows:
- Job number and client name
- Property address
- Damage type icon (water droplet, flame, etc.)
- Insurance carrier
- Start date

Click any job card to open its detail page.

### Using the Sidebar

When you are on the Jobs page, the left sidebar lets you:
- Filter jobs by status (Active, Pending, Lead, Complete)
- Search for specific jobs
- Quickly navigate between projects

---

## Creating a New Job

### Starting Fresh

1. Click the **New Job** button in the top right corner
2. The New Job form opens

### Selecting Job Types

First, choose one or more job types by clicking the buttons:

| Type | Code | Description |
|------|------|-------------|
| **Mitigation** | MIT | Emergency response, water extraction, drying |
| **Reconstruction** | RPR | Rebuilding damaged structures |
| **Remodel** | RMD | Improvements or upgrades |
| **Abatement** | ABT | Asbestos or lead removal |
| **Remediation** | REM | Mold remediation |

You can select multiple types. For example, a water damage job might need both Mitigation (MIT) and Reconstruction (RPR).

### Job Numbers

Job numbers follow this format: **YYYYMM-###-TYPE**

Example: `202601-015-MIT` means:
- **2026** - Year
- **01** - Month (January)
- **015** - Sequential number
- **MIT** - Mitigation

Click the **Generate** button next to each job type to auto-generate the next available number, or type your own.

### Client Information

Fill in the property owner's details:
- **Client Name** - The homeowner or property owner
- **Phone** - Best contact number
- **Email** - For sending documents and updates

If the client is new, Apex automatically creates their record.

### Property Address

Enter where the work will happen:
- Street address
- City, State, ZIP

### Damage Information

- **Damage Source** - Water, fire, smoke, mold, sewage, flood, storm, or other
- **Date of Loss** - When the damage occurred
- **Water Category** (for water jobs):
  - Cat 1: Clean water (broken pipe)
  - Cat 2: Gray water (dishwasher, washing machine)
  - Cat 3: Black water (sewage, flooding)
- **Damage Class**:
  - Class 1: Minimal
  - Class 2: Significant
  - Class 3: Extensive
  - Class 4: Specialty drying needed

### Insurance Information

- **Insurance Carrier** - Select from your saved carriers
- **Claim Number** - The insurance claim reference
- **Policy Number** - The homeowner's policy
- **Deductible** - Amount the client pays out of pocket

### Adjuster Information

Enter the assigned adjuster's contact info for quick reference.

### Assigning Contacts

Search and select contacts to assign to this job - adjusters, subcontractors, or other team members.

### Creating the Job

Click **Create Job** (or "Create 2 Jobs" if you selected multiple types). The job is now in your system with Lead status.

---

## Job Statuses

Every job moves through these stages:

| Status | Color | Meaning |
|--------|-------|---------|
| **Lead** | Blue | Initial inquiry or referral - not yet confirmed |
| **Pending** | Yellow | Approved and scheduled - waiting to start |
| **Active** | Green | Work is in progress |
| **Complete** | Gray | All work is finished |
| **Closed** | Dark Gray | Finalized and invoiced |
| **Cancelled** | Red | Job was abandoned or cancelled |

### Changing Status

On the job detail page, click the status badge in the header. A dropdown appears with all available statuses. Select the new status and it updates immediately.

---

## Job Detail Page

Click any job to open its full details. The page is organized into sections:

### Header Card

Shows the essentials at a glance:
- Job number and client name
- Property address
- Damage type icon
- Current status (click to change)
- Edit button

### Info Cards Row

Three cards show key information:

**Client Card**
- Client name
- Phone (click to call)
- Email (click to compose)
- Mailing address

**Insurance Card**
- Insurance carrier name
- Claim number
- Policy number
- Deductible amount
- Assigned adjusters with contact info

**Property Card**
- Property address
- Structure type and square footage
- Year built
- Damage category and class
- Damage source

### Main Tabs

Switch between different aspects of the job:

#### Dates Tab
Track important milestones:
- Date of loss
- First contact date
- Start date
- Completion date
- Other key dates

#### Documents Tab
Manage photos and files:
- Upload job site photos
- Store contracts and agreements
- Keep inspection reports
- Organize by category

#### Tasks Tab
Job-specific to-do items:
- Add tasks for this project
- Check them off as completed
- Keep your team on track

#### Notes Tab
Record important communications:
- Call logs with clients or adjusters
- Site visit summaries
- Email content
- Internal notes

Add notes by selecting a type (call, email, site visit, internal) and entering your content.

#### Expenses Tab
Track costs for this job:
- **Labor entries** - Employee hours worked
- **Receipts** - Materials and supplies purchased
- **Work orders** - Subcontractor invoices

#### Drying Tab
For water damage jobs, track structural drying:
- Set up monitoring areas
- Log daily readings
- Track moisture levels
- Generate drying reports

### Contacts Section

See everyone assigned to this job:
- Client contacts
- Insurance adjusters
- Subcontractors
- Team members

Each contact shows their name, role, organization, and quick-access phone/email buttons.

---

## Tracking Finances (Accounting Sidebar)

On the right side of the job detail page, the Accounting module shows your financial picture.

### Summary Metrics

- **Total Estimates** - Sum of all estimate amounts
- **Approved** - Estimates the carrier approved
- **Pending** - Estimates awaiting approval
- **Payments Received** - Money collected so far
- **Balance Due** - What is still owed
- **Labor Costs** - Total employee hours cost
- **Materials/Expenses** - Receipts and supplies
- **Gross Profit** - Revenue minus costs
- **Margin %** - Profit percentage

### Quick Action Buttons

- **Add Estimate** - Create a new estimate
- **Add Receipt** - Log a material purchase
- **Log Labor** - Record employee hours
- **Add Work Order** - Create a subcontractor order
- **Ready to Invoice** - Mark the job for invoicing

### Breakdown Section

Expandable lists show details:
- Each estimate with version, amount, and status
- Each payment with date and method
- Labor entries by employee
- Receipts and expenses

---

## Estimates

### Adding an Estimate

1. Click **Add Estimate** in the Accounting sidebar
2. Select the estimate type (Mitigation, Reconstruction, etc.)
3. Enter the amount
4. Choose the status:
   - **Draft** - Not yet sent
   - **Submitted** - Sent to carrier
   - **Approved** - Carrier accepted
   - **Revision Requested** - Carrier wants changes
   - **Denied** - Carrier rejected
5. Upload the Xactimate PDF (required)
6. Add any notes
7. Click **Add Estimate**

### Version Tracking

Estimates automatically track versions. When you submit a supplement or revision:
- Original estimate is v1
- First supplement is v2
- And so on

The system calculates reduction percentages to show how much the carrier cut:
- 1-10% reduction: Green (acceptable)
- 11-15%: Yellow (moderate)
- 16-20%: Orange (concerning)
- 21%+: Red (significant reduction)

### Uploading Xactimate Files

Click the upload area to select your Xactimate PDF export. Files up to 50 MB are supported. The PDF is stored with the estimate for easy reference.

---

## Recording Payments

### Logging a Payment

1. Click **Add Payment** (or use the Accounting sidebar)
2. Enter the amount
3. Select payment method:
   - Check
   - ACH Transfer
   - Credit Card
   - Cash
4. Choose payment type:
   - Initial Payment
   - Progress Payment
   - Supplement Payment
   - Final Payment
   - Deductible
5. Add check number if applicable
6. Enter received and deposited dates
7. Link to a specific estimate (optional)
8. Add any notes
9. Click **Record Payment**

### Tracking Who Owes What

The Accounting sidebar always shows:
- Total approved estimates
- Payments received
- Balance due

This tells you exactly what each insurance carrier or client still owes.

---

## Labor and Time Tracking

### Logging Employee Hours

1. Click **Log Labor** in the Accounting sidebar
2. Select the date worked
3. Enter hours (in quarter-hour increments)
4. Choose work category:
   - **Demo / Tear-out** - Removing damaged materials
   - **Drying Setup** - Installing equipment
   - **Cleanup** - Cleaning and sanitizing
   - **Monitoring** - Daily moisture checks
   - **Repair** - Reconstruction work
   - **Admin / Documentation** - Paperwork, photos
   - **Travel** - Driving to/from job site
   - **Other** - Anything else
5. Enter hourly rate (optional, for cost calculation)
6. Add description of work performed
7. Check if hours are billable
8. Click **Log Hours**

### Billable vs Non-Billable

Check the "Billable hours" box for time that gets invoiced. Uncheck it for internal time that is not charged to the job (like travel or admin work you absorb).

### Job Costing

The Accounting sidebar totals all labor:
- Total hours worked
- Total labor cost
- Billable hours and cost

This feeds into your gross profit calculation.

---

## Activity Log

Every change to a job is automatically recorded in the Activity Log. Located at the bottom of the Accounting sidebar, it shows:

- What changed (status, estimate added, payment recorded)
- Who made the change
- When it happened
- Before and after values

This gives you a complete audit trail. If you need to know when an estimate was submitted or who changed a status, check the Activity Log.

---

## Tips for Managing Jobs

**Stay on top of statuses** - Update job status as work progresses. This keeps your dashboard accurate and helps with scheduling.

**Use notes liberally** - Document every call with an adjuster, every site visit observation. Notes are searchable and create a paper trail.

**Track labor daily** - Have your team log hours at the end of each day while details are fresh. Waiting leads to forgotten time.

**Upload estimates immediately** - As soon as you export from Xactimate, upload to Apex. This keeps everything in one place.

**Record payments when received** - Log payments the day the check arrives. Waiting leads to cash flow confusion.

**Assign contacts early** - Link adjusters and subcontractors to jobs right away. This makes communication tracking easier.

---

## Common Questions

**Can I change a job number after creation?**
Yes, use the Edit button on the job detail page. However, keep changes minimal to avoid confusion in external communications.

**How do I delete a job?**
Jobs cannot be deleted to maintain audit trails. Instead, change the status to Cancelled.

**Can one client have multiple jobs?**
Yes. Each property or loss is a separate job, even for the same client.

**What if the carrier requests changes to an estimate?**
Add a new estimate version. This preserves the original and tracks the revision history.

**How do I see all jobs for one insurance carrier?**
Use the search bar to search by carrier name, or filter in the Jobs sidebar.
