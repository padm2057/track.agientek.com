
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
  "id": simpleId(),
  "smart_goal": "Lose 6 kg in 6 months by strictly walking 7 km per day, tracking progress daily and reviewing monthly.",
  "total_estimated_duration_hours": 250,
  "project_start_date": todayStr,
  "non_working_days": [],
  "daily_logs": [],
  "tasks": [
    {
      "id": "1",
      "phase": "Preparation",
      "task_name": "Buy high-quality walking shoes & rain gear",
      "duration_hours": 4,
      "predecessors": [],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "2",
      "phase": "Preparation",
      "task_name": "Map out safe 7km route & install tracking app",
      "duration_hours": 2,
      "predecessors": ["1"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "3",
      "phase": "Execution: Month 1",
      "task_name": "Walk 7km Daily (Weeks 1-4) - Habit Building",
      "duration_hours": 42, 
      "predecessors": ["2"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "4",
      "phase": "Review",
      "task_name": "Month 1 Review: Weigh-in & Log Check",
      "duration_hours": 1,
      "predecessors": ["3"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "5",
      "phase": "Execution: Month 2",
      "task_name": "Walk 7km Daily (Weeks 5-8) - Pace Increase",
      "duration_hours": 40,
      "predecessors": ["4"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "6",
      "phase": "Review",
      "task_name": "Month 2 Review: Weigh-in",
      "duration_hours": 1,
      "predecessors": ["5"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "7",
      "phase": "Execution: Month 3",
      "task_name": "Walk 7km Daily (Weeks 9-12)",
      "duration_hours": 40,
      "predecessors": ["6"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "8",
      "phase": "Review",
      "task_name": "Mid-Point Review (3 Months): Gear Check & Weigh-in",
      "duration_hours": 2,
      "predecessors": ["7"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "9",
      "phase": "Execution: Months 4-6",
      "task_name": "Walk 7km Daily (Weeks 13-24) - Endurance Mode",
      "duration_hours": 120,
      "predecessors": ["8"],
      "isCompleted": false,
      "hoursCompleted": 0
    },
    {
      "id": "10",
      "phase": "Completion",
      "task_name": "Final Weigh-in & Success Celebration",
      "duration_hours": 2,
      "predecessors": ["9"],
      "isCompleted": false,
      "hoursCompleted": 0
    }
  ]
};