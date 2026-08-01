export const rootHelp = `Lingo — turn learning into durable knowledge

Usage:
  lingo <command> [options]

Commands:
  lingo start
  lingo course create (--data <json> | --data-file <path>)
  lingo note create (--data <json> | --data-file <path>)
  lingo note content set <note-id> (--data <json> | --data-file <path>)
  lingo note content get <note-id>
  lingo note memo set <note-id> (--data <json> | --data-file <path>)
  lingo note memo get <note-id>
  lingo note source add <note-id> (--data <json> | --data-file <path>)
  lingo note source list <note-id>
  lingo note source remove <source-id>
  lingo relation add <note-id> (--data <json> | --data-file <path>)
  lingo relation list <note-id>
  lingo relation remove <relation-id>
  lingo question add <note-id> (--data <json> | --data-file <path>)
  lingo answer set <question-id> (--data <json> | --data-file <path>)
  lingo answer list <note-id>
  lingo evaluation set <question-id> (--data <json> | --data-file <path>)

Options:
  -h, --help    Show this help
  --version     Show the installed version as JSON
  --update      Update a standalone install to the latest stable release

Structured input:
  Use exactly one of --data or --data-file for commands that accept JSON.

Quick start:
  lingo start

Documentation:
  https://github.com/builder-mafia/lingo
`;
