import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../models/app_models.dart';

/// Codex Sandbox Permission Modes available across AvA Code
const List<Map<String, dynamic>> kDefaultSandboxOptions = [
  {
    'id': 'workspace-write',
    'name': 'Workspace Write',
    'short': 'Workspace',
    'badge': 'RECOMMENDED',
    'desc': 'Safe write & edit inside workspace. Sensitive bash commands require confirmation.',
    'icon': LucideIcons.shieldCheck,
    'color': Color(0xFF38BDF8),
  },
  {
    'id': 'danger-full-access',
    'name': 'Full Access',
    'short': 'Full Access',
    'badge': 'AUTONOMOUS',
    'desc': 'Full server & root directory access. Shell commands run autonomously without approval prompts.',
    'icon': LucideIcons.zap,
    'color': Color(0xFFF59E0B),
  },
  {
    'id': 'read-only',
    'name': 'Read Only',
    'short': 'Read Only',
    'badge': 'AUDITING',
    'desc': 'Inspection & research only. All file writes, edits, and shell modifications are locked.',
    'icon': LucideIcons.lock,
    'color': Color(0xFF10B981),
  },
];

/// Codex Reasoning Effort Presets
const List<Map<String, dynamic>> kDefaultReasoningEfforts = [
  {
    'id': 'none',
    'name': 'None',
    'desc': 'No reasoning effort. Fastest response times.',
    'icon': LucideIcons.zap,
    'color': Color(0xFF94A3B8),
  },
  {
    'id': 'low',
    'name': 'Low',
    'desc': 'Light reasoning for simple coding queries and lookups.',
    'icon': LucideIcons.sparkles,
    'color': Color(0xFF10B981),
  },
  {
    'id': 'medium',
    'name': 'Medium',
    'desc': 'Balanced reasoning for everyday programming and debugging.',
    'badge': 'DEFAULT',
    'icon': LucideIcons.brain,
    'color': Color(0xFF6366F1),
  },
  {
    'id': 'high',
    'name': 'High',
    'desc': 'Deep thinking for complex refactoring and multi-step tasks.',
    'icon': LucideIcons.compass,
    'color': Color(0xFF38BDF8),
  },
  {
    'id': 'xhigh',
    'name': 'Extra High',
    'desc': 'Maximum reasoning budget for demanding architectural decisions.',
    'badge': 'MAX',
    'icon': LucideIcons.flame,
    'color': Color(0xFFEC4899),
  },
];

/// Built-in and registered slash commands catalog
const List<SlashCommandItem> kDefaultSlashCommands = [
  // Registered AvA Core Workspace Commands
  SlashCommandItem(command: '/init', title: 'Init AGENTS.md', description: 'Guided setup for repository AGENTS.md instructions', icon: LucideIcons.fileText, category: 'Registered'),
  SlashCommandItem(command: '/review', title: 'Review Code', description: 'Review changes [commit|branch|pr], defaults to uncommitted', icon: LucideIcons.eye, category: 'Registered'),
  SlashCommandItem(command: '/commit', title: 'Git Commit', description: 'Commit staged or uncommitted diff summary', icon: LucideIcons.gitCommit, category: 'Registered'),
  SlashCommandItem(command: '/issues', title: 'GitHub Issues', description: 'Find and triage issues on GitHub', icon: LucideIcons.circleAlert, category: 'Registered'),
  SlashCommandItem(command: '/changelog', title: 'Generate Changelog', description: 'Generate release notes and changelog from commit history', icon: LucideIcons.history, category: 'Registered'),
  SlashCommandItem(command: '/learn', title: 'Extract Learnings', description: 'Extract learnings to AGENTS.md files for agent understanding', icon: LucideIcons.brain, category: 'Registered'),
  SlashCommandItem(command: '/spellcheck', title: 'Spellcheck Docs', description: 'Spellcheck all markdown file changes', icon: LucideIcons.checkCheck, category: 'Registered'),
  SlashCommandItem(command: '/rmslop', title: 'Remove AI Slop', description: 'Remove AI code slop and verbose comments', icon: LucideIcons.scissors, category: 'Registered'),
  SlashCommandItem(command: '/translate', title: 'Translate Content', description: 'Translate English text/docs to other languages', icon: LucideIcons.languages, category: 'Registered'),
  SlashCommandItem(command: '/ai-deps', title: 'Bump AI Dependencies', description: 'Bump AI SDK dependencies minor / patch versions', icon: LucideIcons.package, category: 'Registered'),

  // Builtin AvA Code Session Commands
  SlashCommandItem(command: '/new', title: 'New Session', description: 'Start a clean session with default workspace', icon: LucideIcons.plusCircle, category: 'Session'),
  SlashCommandItem(command: '/compact', title: 'Compact Context', description: 'Summarize and compress conversation context', icon: LucideIcons.minimize2, category: 'Session'),
  SlashCommandItem(command: '/undo', title: 'Undo Turn', description: 'Revert the last prompt and execution turn', icon: LucideIcons.undo2, category: 'Session'),
  SlashCommandItem(command: '/redo', title: 'Redo Turn', description: 'Redo previously reverted assistant turn', icon: LucideIcons.redo2, category: 'Session'),
  SlashCommandItem(command: '/fork', title: 'Fork Session', description: 'Branch conversation history into a new session', icon: LucideIcons.gitFork, category: 'Session'),
  SlashCommandItem(command: '/export', title: 'Export Transcript', description: 'Export full conversation transcript to markdown/JSON', icon: LucideIcons.download, category: 'Session'),
  SlashCommandItem(command: '/share', title: 'Share Session', description: 'Generate shareable link for current session', icon: LucideIcons.share2, category: 'Session'),
  SlashCommandItem(command: '/unshare', title: 'Unshare Session', description: 'Revoke public share link for current session', icon: LucideIcons.link2Off, category: 'Session'),
  SlashCommandItem(command: '/clear', title: 'Clear Chat View', description: 'Clear local UI conversation view', icon: LucideIcons.trash2, category: 'Session'),

  // Builtin AvA Code Navigation & Tools
  SlashCommandItem(command: '/model', title: 'Switch Model', description: 'Select active LLM model & reasoning effort', icon: LucideIcons.cpu, category: 'Tools'),
  SlashCommandItem(command: '/open', title: 'Open File', description: 'Quick open file in Workspace Files Explorer', icon: LucideIcons.folderOpen, category: 'Tools'),
  SlashCommandItem(command: '/terminal', title: 'Open Terminal', description: 'Launch interactive bash shell console', icon: LucideIcons.terminal, category: 'Tools'),
  SlashCommandItem(command: '/context', title: 'Get Context', description: 'Read & search previous session history & rules directly from storage', icon: LucideIcons.brain, category: 'Tools'),
  SlashCommandItem(command: '/save-memory', title: 'Save Memory', description: 'Persist new facts, preferences, or rules into persistent storage', icon: LucideIcons.save, category: 'Tools'),
  SlashCommandItem(command: '/update-memory', title: 'Update Memory', description: 'Update an existing persistent memory record by ID', icon: LucideIcons.fileEdit, category: 'Tools'),
  SlashCommandItem(command: '/delete-memory', title: 'Delete Memory', description: 'Delete persistent memory by ID or domain', icon: LucideIcons.trash2, category: 'Tools'),
  SlashCommandItem(command: '/reset-memory', title: 'Reset Memory', description: 'Wipe and reset persistent memories (project, global, or all)', icon: LucideIcons.rotateCcw, category: 'Tools'),
  SlashCommandItem(command: '/mcp', title: 'MCP Servers', description: 'Inspect connected MCP tools & schemas', icon: LucideIcons.plug, category: 'Tools'),
  SlashCommandItem(command: '/workspace', title: 'Workspace Directory', description: 'Switch active workspace project directory', icon: LucideIcons.briefcase, category: 'Tools'),
];

/// @-mention context menu items (Codex Workspace Contexts)
const List<Map<String, dynamic>> kDefaultAtContextItems = [
  {'label': '@file', 'title': 'Workspace File', 'desc': 'Attach specific workspace file content to prompt', 'icon': LucideIcons.fileCode2, 'category': 'Context', 'color': Color(0xFF38BDF8)},
  {'label': '@folder', 'title': 'Directory Tree', 'desc': 'Attach directory tree and file listing to prompt', 'icon': LucideIcons.folder, 'category': 'Context', 'color': Color(0xFFFBBF24)},
  {'label': '@git', 'title': 'Git Repository', 'desc': 'Attach git repository status, diffs & recent commits', 'icon': LucideIcons.gitBranch, 'category': 'Context', 'color': Color(0xFF34D399)},
  {'label': '@terminal', 'title': 'Terminal Buffer', 'desc': 'Attach active terminal shell console output buffer', 'icon': LucideIcons.terminal, 'category': 'Context', 'color': Color(0xFFA78BFA)},
  {'label': '@problems', 'title': 'Diagnostics', 'desc': 'Attach active linter errors and diagnostics', 'icon': LucideIcons.alertTriangle, 'category': 'Context', 'color': Color(0xFFF87171)},
  {'label': '@mcp', 'title': 'MCP Tools', 'desc': 'Attach active Model Context Protocol tools and servers', 'icon': LucideIcons.plug, 'category': 'Context', 'color': Color(0xFF818CF8)},
  {'label': '@web', 'title': 'Web Content', 'desc': 'Attach live web search or URL fetch context', 'icon': LucideIcons.globe, 'category': 'Context', 'color': Color(0xFF60A5FA)},
  {'label': '@docs', 'title': 'Documentation', 'desc': 'Attach project documentation and guidelines', 'icon': LucideIcons.bookOpen, 'category': 'Context', 'color': Color(0xFF34D399)},
];

/// System-wide Bangla & Unicode font family fallback chain
const List<String> kBanglaFontFamilyFallback = [
  'HindSiliguri',
  'Hind Siliguri',
  'NotoSansBengali',
  'Noto Sans Bengali',
  'sans-serif',
];
