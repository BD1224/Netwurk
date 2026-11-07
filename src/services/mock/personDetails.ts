import "server-only";
// Made-up extra details for the mock search people (see ./people.ts), keyed by person id.
// Shaped like what the real search agent will save per person. All fictional; links go to example.com.
import type { Paper, Repo, SourceLink } from "@/types";

export type StoredDetails = {
  talking_points: string;
  repos: Repo[];
  papers: Paper[];
  accolades: string[];
  sources: SourceLink[];
};

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const url = (path: string) => `https://example.com/${path}`;

const repo = (owner: string, name: string, description: string, language: string, stars: number, days: number): Repo => ({
  name,
  description,
  language,
  stars,
  pushed_at: ago(days),
  url: url(`github/${owner}/${name}`),
});

const paper = (title: string, venue: string, year: number, slug: string): Paper => ({
  title,
  venue,
  year,
  url: url(`papers/${slug}`),
});

export const MOCK_DETAILS: Record<string, StoredDetails> = {
  "mock-maya-okafor": {
    talking_points:
      "Gave a talk on sim-to-real transfer for warehouse grasping\nOpen to mentoring students getting into robot learning",
    repos: [
      repo("mokafor", "grasp-sim", "Simulated bin-picking scenes for policy training", "Python", 412, 2),
      repo("mokafor", "policy-zoo", "Small, readable RL baselines for arms", "Python", 198, 6),
      repo("mokafor", "rosbag-tools", "Trim and label robot recordings", "C++", 74, 19),
      repo("mokafor", "dotfiles", "Neovim and zsh setup", "Lua", 12, 40),
    ],
    papers: [paper("Domain randomization for low-cost grasping", "ICRA Workshop", 2025, "grasping")],
    accolades: ["Best demo, regional robotics meetup 2024", "Lakeside University robotics club captain"],
    sources: [
      { label: "Conference talk", url: url("talks/sim-to-real") },
      { label: "Personal site", url: url("site/maya") },
    ],
  },
  "mock-daniel-reyes": {
    talking_points: "Works on trajectory optimization for legged robots\nPosts reading notes on optimal control",
    repos: [],
    papers: [
      paper("Contact-implicit planning for quadrupeds", "RSS", 2025, "quadrupeds"),
      paper("Fast warm starts for legged MPC", "IROS", 2023, "legged-mpc"),
    ],
    accolades: ["Helio Labs research award, 2025"],
    sources: [{ label: "Lab page", url: url("lab/helio") }],
  },
  "mock-priya-natarajan": {
    talking_points:
      "Studies how language instructions ground into robot actions\nLooking for undergrads to help with data collection",
    repos: [
      repo("priyan", "lang2act", "Benchmark for instruction-following robots", "Python", 890, 1),
      repo("priyan", "vlm-probe", "Probing spatial reasoning in vision-language models", "Python", 455, 8),
      repo("priyan", "lab-scheduler", "Book robot time in the lab", "TypeScript", 23, 30),
    ],
    papers: [
      paper("Grounding instructions in embodied agents", "CoRL", 2025, "grounding"),
      paper("What do VLMs know about space?", "CVPR Workshop", 2024, "vlm-space"),
    ],
    accolades: ["Graduate research fellowship", "Best poster, embodied AI workshop 2025"],
    sources: [
      { label: "Lab page", url: url("lab/embodied") },
      { label: "Google Scholar", url: url("scholar/priya") },
    ],
  },
  "mock-tom-lindqvist": {
    talking_points: "Leads the perception stack for indoor delivery robots\nHiring for perception roles this spring",
    repos: [
      repo("tlindqvist", "depth-fuse", "Fuse stereo and lidar depth on small robots", "C++", 530, 3),
      repo("tlindqvist", "label-lite", "Quick bounding-box labeling in the browser", "TypeScript", 121, 11),
    ],
    papers: [],
    accolades: ["Speaker, robotics perception meetup 2025"],
    sources: [{ label: "Meetup talk", url: url("talks/perception") }],
  },
  "mock-aisha-bello": {
    talking_points: "Designs tactile grippers\nMentors at a local robotics club on weekends",
    repos: [],
    papers: [paper("Soft fingertips with embedded sensing", "RoboSoft", 2024, "fingertips")],
    accolades: ["Hackathon winner, hardware track 2023"],
    sources: [{ label: "Personal site", url: url("site/aisha") }],
  },
  "mock-kenji-watanabe": {
    talking_points: "Runs a lab on coordinating fleets of small drones\nTakes summer research students",
    repos: [
      repo("kwatanabe", "swarm-sim", "Lightweight simulator for drone swarms", "Rust", 760, 4),
      repo("kwatanabe", "consensus-kit", "Distributed consensus for multi-robot teams", "Go", 340, 9),
      repo("kwatanabe", "course-notes", "Lecture notes for multi-robot systems", "Markdown", 58, 25),
    ],
    papers: [
      paper("Decentralized task allocation for drone fleets", "ICRA", 2025, "task-allocation"),
      paper("Formation control under lossy links", "IROS", 2023, "formation"),
    ],
    accolades: ["Early career faculty award, 2024", "Best paper finalist, ICRA 2025"],
    sources: [
      { label: "Faculty page", url: url("faculty/kenji") },
      { label: "Google Scholar", url: url("scholar/kenji") },
    ],
  },
  "mock-sofia-marchetti": {
    talking_points:
      "Previously interned on a home-robot team\nWrites about collecting demonstration data cheaply",
    repos: [
      repo("smarchetti", "teleop-kit", "Phone-based teleoperation for data collection", "Python", 275, 5),
      repo("smarchetti", "demo-cleaner", "Filter bad demonstrations before training", "Python", 90, 14),
    ],
    papers: [],
    accolades: ["Internship return offer, home robotics team"],
    sources: [{ label: "Blog", url: url("blog/sofia") }],
  },
  "mock-owen-brightwater": {
    talking_points: "Early engineer at a warehouse automation startup\nHappy to talk about joining an early team",
    repos: [],
    papers: [],
    accolades: [],
    sources: [{ label: "Personal site", url: url("site/owen") }],
  },
};
