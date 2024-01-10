import createPlugin from "../index.js";
import * as Deploy from "bring-your-own-storage-utilities/deploy"
import {test, solo} from "brittle";

const {pack, rollupVirtualPlugin} = Deploy;

async function bundle(file, content, globals, globalsOptions, rollupConfig = {}) {
  const warns = [];
  rollupConfig.plugins = [
    rollupVirtualPlugin({
      "the-answer": `export default 42;`,
      [file]: content
    }),
    createPlugin(globals, globalsOptions)
  ];
  rollupConfig.onwarn = (warn) => warns.push(warn);
  const {code} = await pack(file, rollupConfig);
  return Deploy.importCode(code);
}

const generateCode = (globalVar, globalValue, importVar, importString) => `
  import ${importVar} from '${importString}';
  globalThis.${globalVar} = '${globalValue}';
  export default 'hello ' + ${importVar};
`;

test("no globals", async(t) => {
  await t.exception.all(
    () => bundle("wontWork.js", generateCode()), "No global object present, error thrown."
  );
});

test("no globals", async(t) => {
  await t.exception.all(
    () => bundle("wontWork.js", generateCode(), 1), "Invalid global"
  );
});

test( "basic", async t => {
  const {default: result} = await bundle(
    "main.js",
    generateCode("longIsland", "icedTea", "irrelevant", "./strongDrinks.js"),
    {
      ["./strongDrinks.js"]: "longIsland"
    }
  );

  t.is(result, "hello icedTea");
});

test( "basic no relevant globals", async t => {
  const {default: result} = await bundle(
    "main.js",
    generateCode("longIsland", "icedTea", "irrelevant", "the-answer"),
    {}
  );

  t.is(result, "hello 42", "");
});
