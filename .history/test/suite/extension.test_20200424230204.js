const assert = require('assert');

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const vscode = require('vscode');
// const screenify = require("../../src/extension")
// const {
//     shootSnippet
// } = require("../../webview/index")
suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test("should be present", () => {
        assert.ok(vscode.extensions.getExtension("adammomen.screenify"));
    });
    test("should be able to register screenify commands", () => {
        return vscode.commands.getCommands(true).then((commands) => {
            const SCREENIFY_COMMANDS = [
                "editor.action.clipboardCopyWithSyntaxHighlightingAction",

            ]
            const foundScreenifyCommands = commands.filter((value) => {
                return SCREENIFY_COMMANDS.indexOf(value) >= 0 || value.startsWith("screenify.");
            });
            const errorMsg = "Some screenify commands are not registered properly or a new command is not added to the test";
            assert.equal(foundScreenifyCommands.length, SCREENIFY_COMMANDS.length,
                errorMsg
            );
        });
    })
})