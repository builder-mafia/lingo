import { Effect } from "effect";

import { Database } from "../layers/database";
import { JsonInput, type JsonInputOptions } from "../layers/json-input";
import { LocalHttpServer } from "../layers/local-http-server";
import { addQuestion } from "./commands/add-question";
import { errorResponse, CliError } from "./errors";
import { createNote } from "./commands/create-note";
import { setSubjectiveAnswer } from "./commands/set-subjective-answer";
import { listSubjectiveAnswers } from "./commands/list-subjective-answers";
import { setSubjectiveEvaluation } from "./commands/set-subjective-evaluation";
import { setNoteSummary } from "./commands/set-note-summary";
import { startServer } from "./commands/start-server";

const noteSummaryUsage =
  "Usage: lingo note summary set <note-id> (--data <json> | --data-file <path>)";
const noteCreateUsage =
  "Usage: lingo note create (--data <json> | --data-file <path>)";
const questionAddUsage =
  "Usage: lingo question add <note-id> (--data <json> | --data-file <path>)";
const subjectiveAnswerUsage =
  "Usage: lingo answer set <question-id> (--data <json> | --data-file <path>)";
const answerListUsage = "Usage: lingo answer list <note-id>";
const evaluationUsage =
  "Usage: lingo evaluation set <question-id> (--data <json> | --data-file <path>)";

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
): Effect.Effect<number, never, JsonInput | Database | LocalHttpServer> => {
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

  if (resource === "note" && type === "summary" && action === "set") {
    const [noteId, ...summaryInputArgs] = inputArgs;

    if (noteId === undefined) {
      console.error(errorResponse(new CliError(noteSummaryUsage)));
      return Effect.succeed(1);
    }

    return parseInputOptions(summaryInputArgs, noteSummaryUsage).pipe(
      Effect.flatMap((inputOptions) => setNoteSummary(noteId, inputOptions)),
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
