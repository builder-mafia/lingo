import { Effect } from "effect";

import { Database } from "../layers/database";
import { JsonInput, type JsonInputOptions } from "../layers/json-input";
import { LocalHttpServer } from "../layers/local-http-server";
import { SelfUpdater } from "../layers/self-updater";
import { addQuestion } from "./commands/add-question";
import { errorResponse, CliError } from "./errors";
import { createNote } from "./commands/create-note";
import { setSubjectiveAnswer } from "./commands/set-subjective-answer";
import { listSubjectiveAnswers } from "./commands/list-subjective-answers";
import { setSubjectiveEvaluation } from "./commands/set-subjective-evaluation";
import { getNoteContent } from "./commands/get-note-content";
import { setNoteContent } from "./commands/set-note-content";
import { startServer } from "./commands/start-server";
import { updateCli } from "./commands/update-cli";
import { rootHelp } from "./help";
import { lingoVersion } from "../version";

const noteContentSetUsage =
  "Usage: lingo note content set <note-id> (--data <json> | --data-file <path>)";
const noteContentGetUsage = "Usage: lingo note content get <note-id>";
const noteCreateUsage =
  "Usage: lingo note create (--data <json> | --data-file <path>)";
const questionAddUsage =
  "Usage: lingo question add <note-id> (--data <json> | --data-file <path>)";
const subjectiveAnswerUsage =
  "Usage: lingo answer set <question-id> (--data <json> | --data-file <path>)";
const answerListUsage = "Usage: lingo answer list <note-id>";
const evaluationUsage =
  "Usage: lingo evaluation set <question-id> (--data <json> | --data-file <path>)";
const helpUsage = "Usage: lingo --help";
const updateUsage = "Usage: lingo --update";
const versionUsage = "Usage: lingo --version";

const parseInputOptions = (
  args: readonly string[],
  usage: string,
): Effect.Effect<JsonInputOptions, CliError> => {
  let data: string | undefined;
  let dataFile: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument === "--data") {
      if (value === undefined) {
        return Effect.fail(new CliError(usage));
      }

      if (data !== undefined) {
        return Effect.fail(new CliError("--data can only be provided once."));
      }

      data = value;
      index += 1;
      continue;
    }

    if (argument === "--data-file") {
      if (value === undefined) {
        return Effect.fail(new CliError(usage));
      }

      if (dataFile !== undefined) {
        return Effect.fail(
          new CliError("--data-file can only be provided once."),
        );
      }

      dataFile = value;
      index += 1;
      continue;
    }

    return Effect.fail(new CliError(usage));
  }

  return Effect.succeed({ data, dataFile });
};

export const runCli = (
  args: readonly string[],
): Effect.Effect<
  number,
  never,
  JsonInput | Database | LocalHttpServer | SelfUpdater
> => {
  if (args[0] === "--help" || args[0] === "-h") {
    if (args.length !== 1) {
      console.error(errorResponse(new CliError(helpUsage)));
      return Effect.succeed(1);
    }
    console.log(rootHelp.trimEnd());
    return Effect.succeed(0);
  }

  if (
    args
      .slice(1)
      .some((argument) => argument === "--help" || argument === "-h")
  ) {
    console.error(
      errorResponse(
        new CliError(args[0] === "--update" ? updateUsage : helpUsage),
      ),
    );
    return Effect.succeed(1);
  }

  if (args[0] === "--update") {
    if (args.length !== 1) {
      console.error(errorResponse(new CliError(updateUsage)));
      return Effect.succeed(1);
    }
    return updateCli().pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(errorResponse(error));
          return 1;
        },
        onSuccess: (data) => {
          console.log(JSON.stringify({ ok: true, data }));
          return 0;
        },
      }),
    );
  }

  if (args[0] === "--version" && args.length !== 1) {
    console.error(errorResponse(new CliError(versionUsage)));
    return Effect.succeed(1);
  }

  if (args.length === 1 && args[0] === "--version") {
    console.log(
      JSON.stringify({ ok: true, data: { version: lingoVersion } }),
    );
    return Effect.succeed(0);
  }

  const [resource, type, action, ...inputArgs] = args;

  if (resource === "start" && type === undefined) {
    return startServer().pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          console.error(errorResponse(error));
          return 1;
        }),
      ),
    );
  }

  if (resource === "question" && type === "add") {
    const [noteId, ...questionInputArgs] = [action, ...inputArgs];
    if (noteId === undefined) {
      console.error(errorResponse(new CliError(questionAddUsage)));
      return Effect.succeed(1);
    }
    return parseInputOptions(questionInputArgs, questionAddUsage).pipe(
      Effect.flatMap((inputOptions) => addQuestion(noteId, inputOptions)),
      Effect.match({
        onFailure: (error) => { console.error(errorResponse(error)); return 1; },
        onSuccess: (data) => { console.log(JSON.stringify({ ok: true, data })); return 0; },
      }),
    );
  }

  if (resource === "answer" && type === "set") {
    const [questionId, ...answerInputArgs] = [action, ...inputArgs];
    if (questionId === undefined) {
      console.error(errorResponse(new CliError(subjectiveAnswerUsage)));
      return Effect.succeed(1);
    }
    return parseInputOptions(answerInputArgs, subjectiveAnswerUsage).pipe(
      Effect.flatMap((inputOptions) => setSubjectiveAnswer(questionId, inputOptions)),
      Effect.match({
        onFailure: (error) => { console.error(errorResponse(error)); return 1; },
        onSuccess: (data) => { console.log(JSON.stringify({ ok: true, data })); return 0; },
      }),
    );
  }

  if (resource === "evaluation" && type === "set") {
    const [questionId, ...evaluationInputArgs] = [action, ...inputArgs];
    if (questionId === undefined) {
      console.error(errorResponse(new CliError(evaluationUsage)));
      return Effect.succeed(1);
    }
    return parseInputOptions(evaluationInputArgs, evaluationUsage).pipe(
      Effect.flatMap((inputOptions) => setSubjectiveEvaluation(questionId, inputOptions)),
      Effect.match({
        onFailure: (error) => { console.error(errorResponse(error)); return 1; },
        onSuccess: (data) => { console.log(JSON.stringify({ ok: true, data })); return 0; },
      }),
    );
  }

  if (resource === "answer" && type === "list") {
    const [noteId, ...unexpectedArgs] = [action, ...inputArgs];
    if (noteId === undefined || unexpectedArgs.length > 0) {
      console.error(errorResponse(new CliError(answerListUsage)));
      return Effect.succeed(1);
    }
    return listSubjectiveAnswers(noteId).pipe(
      Effect.match({
        onFailure: (error) => { console.error(errorResponse(error)); return 1; },
        onSuccess: (data) => { console.log(JSON.stringify({ ok: true, data })); return 0; },
      }),
    );
  }

  if (resource === "note" && type === "create") {
    const noteInputArgs = action === undefined ? inputArgs : [action, ...inputArgs];

    return parseInputOptions(noteInputArgs, noteCreateUsage).pipe(
      Effect.flatMap((inputOptions) => createNote(inputOptions)),
      Effect.match({
        onFailure: (error) => {
          console.error(errorResponse(error));
          return 1;
        },
        onSuccess: (data) => {
          console.log(JSON.stringify({ ok: true, data }));
          return 0;
        },
      }),
    );
  }

  if (resource === "note" && type === "content" && action === "set") {
    const [noteId, ...contentInputArgs] = inputArgs;

    if (noteId === undefined) {
      console.error(errorResponse(new CliError(noteContentSetUsage)));
      return Effect.succeed(1);
    }

    return parseInputOptions(contentInputArgs, noteContentSetUsage).pipe(
      Effect.flatMap((inputOptions) => setNoteContent(noteId, inputOptions)),
      Effect.match({
        onFailure: (error) => {
          console.error(errorResponse(error));
          return 1;
        },
        onSuccess: (data) => {
          console.log(JSON.stringify({ ok: true, data }));
          return 0;
        },
      }),
    );
  }

  if (resource === "note" && type === "content" && action === "get") {
    const [noteId, ...unexpectedArgs] = inputArgs;

    if (noteId === undefined || unexpectedArgs.length > 0) {
      console.error(errorResponse(new CliError(noteContentGetUsage)));
      return Effect.succeed(1);
    }

    return getNoteContent(noteId).pipe(
      Effect.match({
        onFailure: (error) => {
          console.error(errorResponse(error));
          return 1;
        },
        onSuccess: (data) => {
          console.log(JSON.stringify({ ok: true, data }));
          return 0;
        },
      }),
    );
  }

  console.error(errorResponse(new CliError("Unknown command.")));
  return Effect.succeed(1);
};
