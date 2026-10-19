import type { DomainDef } from '../types';

/**
 * Prebuilt domains. Each agent is [name, what it does, tools].
 * `note` is added to every agent prompt in that domain.
 * `flows` are [fromAgentIndex, toAgentIndex, condition] arrows drawn when the team is loaded.
 */
export const DOMAINS: Record<string, DomainDef> = {
  general: { label: 'General purpose', team: 'team of specialist agents', agents: [
    ['Planner Agent', 'Breaks a goal into clear, ordered steps.', ''],
    ['Researcher Agent', 'Finds and summarises relevant information.', 'web_search'],
    ['Writer Agent', 'Drafts clear text from notes and research.', ''],
    ['Reviewer Agent', 'Checks work for errors and gaps, and suggests fixes.', ''],
    ['Data Analyst Agent', 'Analyses numbers and explains what they mean.', 'run_query']
  ]},
  hospitality: { label: 'Hospitality (hotels)', team: 'hotel guest-services team',
    flows: [[5, 1, 'the payment went through'], [5, 6, 'the guest disputes a charge or is unhappy about the bill']], agents: [
    ['Reservation Agent', 'Searches availability and books, changes or cancels stays.', 'search_availability, create_reservation, cancel_reservation'],
    ['Check-in Agent', 'Verifies the guest and completes check-in.', 'find_reservation, complete_check_in'],
    ['Concierge Agent', 'Recommends places and arranges local activities.', 'recommend_places, book_activity'],
    ['Room Service Agent', 'Shows the menu and places food orders.', 'get_menu, place_order'],
    ['Housekeeping Agent', 'Handles cleaning requests and room issues.', 'request_cleaning, report_issue'],
    ['Billing Agent', 'Explains charges and takes payments.', 'get_invoice, process_payment'],
    ['Guest Feedback Agent', 'Collects feedback and handles complaints politely.', '']
  ]},
  education: { label: 'Education', team: 'school or university student-services team', agents: [
    ['Admissions Agent', 'Checks eligibility and guides applications.', 'check_eligibility, submit_application'],
    ['Course Advisor Agent', 'Suggests courses and checks prerequisites.', 'search_courses, check_prerequisites'],
    ['Tutor Agent', 'Explains concepts step by step and quizzes the student.', ''],
    ['Grading Agent', 'Reviews submissions against a rubric and records grades.', 'fetch_submission, save_grade'],
    ['Timetable Agent', 'Finds class times and books rooms.', 'get_timetable, book_room'],
    ['Fees and Scholarship Agent', 'Explains fee status and scholarship options.', 'get_fee_status, find_scholarships'],
    ['Student Support Agent', 'Helps with wellbeing, deadlines and campus questions.', '']
  ]},
  healthcare: { label: 'Healthcare', team: 'clinic patient-services team',
    note: 'You are not a doctor and must never diagnose. In an emergency, tell the person to contact local emergency services immediately.', agents: [
    ['Appointment Agent', 'Finds open slots and books or reschedules visits.', 'find_slots, book_appointment'],
    ['Symptom Intake Agent', 'Records symptoms and history before a visit.', 'record_symptoms'],
    ['Pharmacy Agent', 'Checks stock and handles prescription refills.', 'check_stock, request_refill'],
    ['Insurance Agent', 'Verifies coverage and explains claims.', 'verify_coverage, get_claim_status'],
    ['Lab Results Agent', 'Shares results that are approved for release and explains them simply.', 'get_lab_results'],
    ['Patient Billing Agent', 'Explains bills and sets up payment plans.', 'get_bill, set_payment_plan']
  ]},
  ecommerce: { label: 'E-commerce and retail', team: 'online store team',
    flows: [[3, 4, 'the item qualifies for a refund'], [3, 2, 'the customer would rather have a replacement or exchange']], agents: [
    ['Product Search Agent', 'Finds products that match what the shopper wants.', 'search_products'],
    ['Recommendation Agent', 'Suggests items based on tastes and past orders.', 'get_recommendations'],
    ['Order Agent', 'Places orders and tracks deliveries.', 'create_order, track_order'],
    ['Returns Agent', 'Starts returns and exchanges.', 'start_return, create_exchange'],
    ['Refund Agent', 'Checks eligibility and issues refunds.', 'check_refund_eligibility, issue_refund'],
    ['Payment Agent', 'Handles payment problems and invoices.', 'process_payment, get_invoice']
  ]},
  banking: { label: 'Banking and finance', team: 'bank customer-service team',
    note: 'Never ask for full card numbers, PINs or passwords.', agents: [
    ['Account Agent', 'Shows balances and recent transactions.', 'get_balance, get_transactions'],
    ['Loan Agent', 'Explains loan options and estimates repayments.', 'check_loan_eligibility, calculate_emi'],
    ['Card Agent', 'Blocks lost cards and arranges replacements.', 'block_card, request_replacement'],
    ['Fraud Alert Agent', 'Reviews suspicious activity and secures the account.', 'flag_transaction, freeze_account'],
    ['KYC Agent', 'Checks identity documents for account opening.', 'verify_documents'],
    ['Savings and Investment Agent', 'Explains savings and investment products in plain language.', 'list_products']
  ]},
  support: { label: 'Customer support', team: 'customer support team',
    flows: [[0, 1, 'it is a common question the help articles likely answer'], [0, 2, 'it needs investigation, so a ticket should be created'], [0, 4, 'the customer is upset or the issue is urgent or sensitive']], agents: [
    ['Triage Agent', 'Understands the issue and sorts it by type and urgency.', 'classify_ticket'],
    ['Knowledge Base Agent', 'Answers from help articles and FAQs.', 'search_knowledge_base'],
    ['Ticket Agent', 'Creates and updates support tickets.', 'create_ticket, update_ticket'],
    ['Account Agent', 'Helps with login, billing and plan changes.', 'lookup_account, update_plan'],
    ['Escalation Agent', 'Hands hard or sensitive cases to a human with a clear summary.', 'escalate_to_human'],
    ['Survey Agent', 'Asks for feedback after an issue is resolved.', 'send_survey']
  ]},
  travel: { label: 'Travel and airlines', team: 'travel booking team', agents: [
    ['Flight Search Agent', 'Finds flights that match dates, budget and preferences.', 'search_flights'],
    ['Booking Agent', 'Books, changes and cancels trips.', 'book_flight, cancel_booking'],
    ['Hotel and Stay Agent', 'Finds and books accommodation.', 'search_hotels, book_hotel'],
    ['Itinerary Agent', 'Builds a day-by-day travel plan.', 'build_itinerary'],
    ['Visa and Documents Agent', 'Explains entry requirements and the documents needed. Tells travellers to confirm with official sources.', 'check_requirements'],
    ['Baggage and Check-in Agent', 'Handles check-in and baggage rules.', 'check_in_passenger, get_baggage_rules']
  ]},
  realestate: { label: 'Real estate', team: 'real-estate agency team', agents: [
    ['Listing Search Agent', 'Finds properties that match the buyer or renter.', 'search_listings'],
    ['Viewing Scheduler Agent', 'Books property viewings.', 'find_viewing_slots, book_viewing'],
    ['Mortgage Agent', 'Estimates monthly payments and explains loan options.', 'estimate_mortgage'],
    ['Valuation Agent', 'Estimates property value from comparable sales.', 'get_comparables'],
    ['Contracts Agent', 'Explains lease and sale paperwork in plain language. General information only, not legal advice.', ''],
    ['Tenant Support Agent', 'Handles maintenance requests and rent questions.', 'create_maintenance_request']
  ]},
  hr: { label: 'HR and recruiting', team: 'HR team', agents: [
    ['Resume Screener Agent', 'Compares CVs against a job description.', 'parse_resume'],
    ['Interview Scheduler Agent', 'Finds interview slots and sends invites.', 'find_interview_slots, send_invite'],
    ['Onboarding Agent', 'Guides new hires through first-week tasks.', 'get_onboarding_checklist'],
    ['Leave and Attendance Agent', 'Checks leave balances and requests time off.', 'check_leave_balance, request_leave'],
    ['Payroll Agent', 'Answers pay and tax-form questions.', 'get_payslip'],
    ['Policy Q and A Agent', 'Answers questions from HR policy documents.', 'search_policies']
  ]},
  software: { label: 'Software development', team: 'software engineering team',
    flows: [[2, 1, 'the review found problems that need fixing'], [2, 3, 'the code looks good and needs tests']], agents: [
    ['Planner Agent', 'Turns a request into tasks and an approach.', ''],
    ['Coder Agent', 'Writes and edits code.', 'read_file, write_file'],
    ['Code Reviewer Agent', 'Reviews code for bugs, security and style.', ''],
    ['Test Writer Agent', 'Writes and runs tests.', 'run_tests'],
    ['Documentation Agent', 'Writes READMEs, docstrings and usage guides.', ''],
    ['DevOps Agent', 'Handles builds, deployments and logs.', 'run_pipeline, get_logs']
  ]},
  legal: { label: 'Legal', team: 'legal-services team',
    note: 'You give general information, not legal advice, and recommend a qualified lawyer for decisions.', agents: [
    ['Client Intake Agent', 'Collects facts and sorts the matter by type.', ''],
    ['Contract Review Agent', 'Flags risky or unusual clauses.', ''],
    ['Legal Research Agent', 'Finds relevant statutes and cases.', 'search_case_law'],
    ['Drafting Agent', 'Drafts letters and standard documents.', ''],
    ['Compliance Agent', 'Checks activities against policies and regulations.', 'search_regulations']
  ]},
  marketing: { label: 'Marketing and content', team: 'content and marketing team', agents: [
    ['Research Agent', 'Finds audience, competitor and trend insights.', 'web_search'],
    ['Content Writer Agent', 'Drafts blog posts, emails and ads in the brand voice.', ''],
    ['Editor Agent', 'Fixes grammar and tightens tone.', ''],
    ['SEO Agent', 'Suggests keywords and improves search visibility.', 'get_keywords'],
    ['Social Media Agent', 'Adapts content for each platform.', ''],
    ['Analytics Agent', 'Reports on campaign results.', 'get_campaign_stats']
  ]},
  logistics: { label: 'Logistics and supply chain', team: 'logistics and supply-chain team', agents: [
    ['Order Tracking Agent', 'Tells customers where a shipment is.', 'track_shipment'],
    ['Route Planner Agent', 'Plans efficient delivery routes.', 'plan_route'],
    ['Inventory Agent', 'Checks stock levels and reorders.', 'check_inventory, reorder_stock'],
    ['Warehouse Agent', 'Schedules pickups and dock slots.', 'schedule_pickup'],
    ['Customs Agent', 'Explains customs rules and paperwork.', 'check_customs_rules'],
    ['Delivery Support Agent', 'Handles delays and failed deliveries.', 'reschedule_delivery']
  ]},
  custom: { label: 'Custom (start blank)', team: 'team of specialist agents', agents: [] }
};
