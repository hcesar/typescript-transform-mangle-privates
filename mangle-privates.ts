import * as ts from "typescript";

export default function (program: ts.Program, pluginOptions: {}) {
  return (ctx: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      function visitor(node: ts.Node): ts.Node {
        if (ts.isClassDeclaration(node)) {
          console.log(node.getText());
          return transformClass(node, ctx);
        }

        return ts.visitEachChild(node, visitor, ctx);
      }
      return ts.visitEachChild(sourceFile, visitor, ctx);
    };
  };
}

function transformClass(
  node: ts.ClassDeclaration,
  ctx: ts.TransformationContext
) {
  const mangledProps = new Map<string, string>();
  node = manglePrivates(node, ctx, mangledProps);
  node = updateCalls(node, ctx, mangledProps);
  return node;
}

let currentName: number = "a".charCodeAt(0);

function manglePrivates(
  node: ts.ClassDeclaration,
  ctx: ts.TransformationContext,
  mangledProps: Map<string, string>
) {
  function visitor(node: ts.Node): ts.Node {
    if (
      !ts.isMethodDeclaration(node) ||
      !node.getFullText().includes("private ")
    ) {
      return node;
    }

    const newName = String.fromCharCode(currentName++);
    mangledProps.set(node.name.getText(), newName);

    return ts.factory.createMethodDeclaration(
      ts.getDecorators(node),
      ts.getModifiers(node),
      node.asteriskToken,
      ts.factory.createIdentifier(newName),
      node.questionToken,
      node.typeParameters,
      node.parameters,
      node.type,
      node.body
    );
  }

  return ts.visitEachChild(node, visitor, ctx);
}

function updateCalls(
  node: ts.ClassDeclaration,
  ctx: ts.TransformationContext,
  mangledProps: Map<string, string>
) {
  function visitor(node: ts.Node): ts.Node {
    if (!ts.isCallExpression(node) || node.expression.getChildCount() < 3) {
      return ts.visitEachChild(node, visitor, ctx);
    }

    const fn = node.expression.getChildAt(2);
    if (
      node.expression.getChildAt(0).getText() === "this" &&
      mangledProps.has(fn.getText())
    ) {
      const newName = mangledProps.get(fn.getText());
      return updateCall(node, ctx, fn.getText(), newName);
    }

    return ts.visitEachChild(node, visitor, ctx);
  }
  return ts.visitEachChild(node, visitor, ctx);
}

function updateCall(
  node: ts.CallExpression,
  ctx: ts.TransformationContext,
  name: string,
  newName: string
) {
  function visitor(node: ts.Node): ts.Node {
    if (node.getText() !== name) {
      return ts.visitEachChild(node, visitor, ctx);
    }
    return ts.factory.createIdentifier(newName);
  }
  return ts.visitEachChild(node, visitor, ctx);
}
