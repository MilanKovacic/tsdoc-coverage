/* eslint-disable no-restricted-syntax */
import { Project, SourceFile, SyntaxKind, ts } from "ts-morph";
import { TSDocParser } from "@microsoft/tsdoc";

const excludePath = "node_modules";
const typescriptFilesGlob = "**/*.{ts,tsx}";

type DataRow = {
  "File Path": string;
  "Total Declarations": number;
  "Documented Declarations": number;
  "Undocumented Lines": string;
  Percentage: string;
};

const getAllDeclarationTypesToBeChecked = (sourceFile: SourceFile) => {
  const regularFunctions = sourceFile.getFunctions();

  const variableInitFunctions = sourceFile
    .getVariableDeclarations()
    .filter((variable) => {
      const initializerKind = variable.getInitializer()?.getKind();
      return (
        initializerKind === SyntaxKind.ArrowFunction ||
        initializerKind === SyntaxKind.FunctionExpression
      );
    });

  return [...regularFunctions, ...variableInitFunctions];
};

function processSourceFile(sourceFile: SourceFile) {
  let validTSDocCount = 0;
  const undocumentedRanges = [];
  const allFunctions = getAllDeclarationTypesToBeChecked(sourceFile);
  const totalCount = allFunctions.length;

  for (const fn of allFunctions) {
    const leadingCommentsRanges = ts.getLeadingCommentRanges(
      sourceFile.getFullText(),
      fn.getPos(),
    );

    if (!leadingCommentsRanges) {
      undocumentedRanges.push(
        `${fn.getStartLineNumber()}-${fn.getEndLineNumber()}`,
      );
      // eslint-disable-next-line no-continue
      continue;
    }

    const comment = sourceFile
      .getFullText()
      .slice(leadingCommentsRanges[0].pos, leadingCommentsRanges[0].end);

    if (comment.startsWith("/**")) {
      const parser = new TSDocParser();
      const docComment = parser.parseString(comment);

      if (docComment.log.messages.length === 0) {
        validTSDocCount += 1;
      } else {
        undocumentedRanges.push(
          `${fn.getStartLineNumber()}-${fn.getEndLineNumber()}`,
        );
      }
    }
  }

  return {
    totalCount,
    validTSDocCount,
    undocumentedRanges: undocumentedRanges.join(", "),
  };
}

function countTopLevelFunctionsWithTSDoc() {
  const project = new Project({});
  const totalSourceFiles = project
    .addSourceFilesAtPaths(typescriptFilesGlob)
    .filter((file) => !file.getFilePath().includes(excludePath));

  let totalDeclarations = 0;
  let totalDocumented = 0;
  const data: DataRow[] = totalSourceFiles.map((sourceFile): DataRow => {
    const { validTSDocCount, totalCount, undocumentedRanges } =
      processSourceFile(sourceFile);
    totalDeclarations += totalCount;
    totalDocumented += validTSDocCount;
    return {
      "File Path": sourceFile.getFilePath(),
      "Total Declarations": totalCount,
      "Documented Declarations": validTSDocCount,
      "Undocumented Lines": undocumentedRanges,
      Percentage: `${Math.round((validTSDocCount / totalCount) * 100)}%`,
    };
  });

  data.push({
    "File Path": "Total",
    "Total Declarations": totalDeclarations,
    "Documented Declarations": totalDocumented,
    "Undocumented Lines": "",
    Percentage: `${Math.round((totalDocumented / totalDeclarations) * 100)}%`,
  });

  // eslint-disable-next-line no-console
  console.table(data);
}

export default countTopLevelFunctionsWithTSDoc;
