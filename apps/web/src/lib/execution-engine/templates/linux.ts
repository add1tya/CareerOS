import type { SkillExecutionTemplate } from "./index";

/** Linux — from ontology Suggested Projects (run a personal server for a real workload). */
export const linuxTemplate: SkillExecutionTemplate = {
  skillKey: "linux",
  templateVersion: 1,
  mission: {
    title: "Operate a Linux server",
    description:
      "Provision, run, and maintain a real Linux server for an actual workload — the operating environment nearly all production AI infrastructure runs on.",
  },
  quests: [
    {
      title: "Provision and run a service",
      description: "Stand up a server and get a real service running on it.",
      tasks: [
        {
          title: "Provision a cloud VM",
          description:
            "Create a small Linux VM, connect over SSH with key auth, and update the system.",
          estimatedMinutes: 45,
        },
        {
          title: "Deploy a small service",
          description:
            "Install and run a simple web service (your own or off-the-shelf) and reach it.",
          estimatedMinutes: 60,
        },
        {
          title: "Configure a systemd unit",
          description:
            "Write a systemd service so the workload starts on boot and restarts on failure.",
          estimatedMinutes: 60,
        },
        {
          title: "Set up a basic firewall",
          description:
            "Restrict inbound access to only the ports you need with ufw or nftables.",
          estimatedMinutes: 30,
        },
      ],
    },
    {
      title: "Diagnose and maintain",
      description: "Practice the day-two skills of keeping a server healthy.",
      tasks: [
        {
          title: "Inspect processes and disk usage",
          description:
            "Use top/htop, ps, df, and du to understand what's running and what's consuming resources.",
          estimatedMinutes: 45,
        },
        {
          title: "Diagnose an issue from logs",
          description:
            "Break something intentionally, then find the cause via journalctl and log files.",
          estimatedMinutes: 45,
        },
        {
          title: "Automate a maintenance task with cron",
          description:
            "Schedule a recurring job (backup, cleanup, or health check) and verify it runs.",
          estimatedMinutes: 45,
        },
      ],
    },
  ],
};
