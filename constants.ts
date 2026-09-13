
import { ProjectPlan } from './types';

// Generate today's date string for default
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayStr = `${year}-${month}-${day}`;

// Simple UUID generator for the default plan
const simpleId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const DEFAULT_PROJECT_PLAN: ProjectPlan = {
  "id": "hire-ai-boss-mvp",
  "smart_goal": "Launch 'Hire an AI Boss' MVP by Jan 20, 2026, securing 5 free beta users and 1 paid user ($20/mo).",
  "total_estimated_duration_hours": 106,
  "project_start_date": "2026-01-02",
  "non_working_days": [],
  "daily_logs": [],
  "tasks": [
    {
      "id": "1",
      "phase": "Definition & Architecture",
      "task_name": "Define Core AI Boss Persona & Accountability Protocol",
      "duration_hours": 6,
      "predecessors": [],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "2",
      "phase": "Definition & Architecture",
      "task_name": "System Prompt Engineering & Daily Standup Conversation Flow",
      "duration_hours": 8,
      "predecessors": ["1"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "3",
      "phase": "MVP Build",
      "task_name": "Build Daily Standup & Check-in Execution Engine",
      "duration_hours": 12,
      "predecessors": ["2"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "4",
      "phase": "MVP Build",
      "task_name": "Task Breakdown & Progress Verification Logic",
      "duration_hours": 10,
      "predecessors": ["3"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "5",
      "phase": "MVP Build",
      "task_name": "User Dashboard & Goal Progress Visualizer",
      "duration_hours": 12,
      "predecessors": ["2"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "6",
      "phase": "MVP Build",
      "task_name": "Stripe Checkout Integration for $20/mo Tier",
      "duration_hours": 8,
      "predecessors": ["5"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "7",
      "phase": "Beta Acquisition",
      "task_name": "Build High-Converting Landing Page & Beta Application",
      "duration_hours": 8,
      "predecessors": ["1"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "8",
      "phase": "Beta Acquisition",
      "task_name": "Outreach to Founder Communities to Secure 5 Free Beta Users",
      "duration_hours": 10,
      "predecessors": ["7"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "9",
      "phase": "Beta Acquisition",
      "task_name": "Onboard 5 Free Beta Users & Run Active 7-Day Test Cohort",
      "duration_hours": 14,
      "predecessors": ["4", "6", "8"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "10",
      "phase": "Conversion & Launch",
      "task_name": "Collect Beta Feedback & Iterate on High-Friction Touchpoints",
      "duration_hours": 8,
      "predecessors": ["9"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "11",
      "phase": "Conversion & Launch",
      "task_name": "Pitch $20/mo Founding Member Tier to Beta Cohort",
      "duration_hours": 4,
      "predecessors": ["10"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "12",
      "phase": "Conversion & Launch",
      "task_name": "Secure 1st Paid Subscriber ($20/mo) & Public MVP Launch",
      "duration_hours": 6,
      "predecessors": ["11"],
      "isCompleted": false,
      "hoursCompleted": 0
    }
  ]
};