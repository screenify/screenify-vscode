/*---------------------------------------------------------------------------------------------
 * Copyright(c) Screenify📸.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = require("vscode"),
    fs = require("fs"),
    path = require("path"),
    os = require("os"),
    P_TITLE = "Screenify 📸",
    fetch = require("node-fetch"),
    Bluebird = require("bluebird"),
    {
        copyImg,
    } = require("img-clipboard"),
    {
        readHtml,
    } = require("./utils");
fetch.Promise = Bluebird;

/**
 * @param {vscode.ExtensionContext} context
 * Extension Acativation
 **/
function activate(context) {
    const {
        subscriptions,
    } = context;

    /** Status Bar configuration **/
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );
    statusBarItem.command = "screenify.activate";
    statusBarItem.text = `$(device-camera) Screenify`;
    statusBarItem.tooltip = "Capture Code Snippet";
    statusBarItem.show();
    subscriptions.push(statusBarItem);

    /** @class HelpDataProvider
     *  Tree institation for view container tree items
     **/
    class HelpDataProvider {
        constructor() {
            this.data = [
                new TreeItem(
                    "Give me your feedback",
                    "twitter.svg",
                    "https://twitter.com/adammuman81",
                ),
                new TreeItem(
                    "Report an issue",
                    "github.png",
                    "https://github.com/AdamMomen/screenify-vscode/issues",
                ),
                new TreeItem(
                    "Support",
                    "icon-heart.svg",
                    "https://www.patreon.com/adammomen",
                ),
            ];
        }
        getTreeItem(element) {
            return element;
        }

        getChildren(element = undefined) {
            if (element === undefined) {
                return this.data;
            }
            return element.children;
        }
    }

    /** @class GettingStartedDataProvider
     *  Tree institation for view container tree items
     **/
    class GettingStartedDataProvider {
        constructor() {
            this.data = [
                new TreeItem("Start Screenify 📸", "", "", {
                    title: "Start Screenify",
                    command: "screenify.activate",
                    context: "start",
                }),
            ];
        }
        getTreeItem(element) {
            return element;
        }

        getChildren(element = undefined) {
            if (element === undefined) {
                return this.data;
            }
            return element.children;
        }
    }
    class TreeItem extends vscode.TreeItem {
            constructor(label, icon, uri, cmd = {
                title: "Open Uri",
                command: "help.openUri",
                context: "openUrl",
            }) {
                super(label, vscode.TreeItemCollapsibleState.None);
                this.iconPath = path.join(context.extensionPath, "resources", icon);
                this.command = {
                    title: cmd.title,
                    command: cmd.command,
                    arguments: [uri],
                };
                this._uri = uri;
                this.contextValue = cmd.context;
            }
        }
        /** Register Tree Data provider **/
    vscode.window.registerTreeDataProvider("help", new HelpDataProvider());

    /** Register Tree Data provider **/
    vscode.window.registerTreeDataProvider(
        "gettingStarted",
        new GettingStartedDataProvider(),
    );

    /** Register command**/
    vscode.commands.registerCommand("help.openUri", (node) => {
        vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(node));
    });

    /** Path to Html file **/
    const htmlPath = path.resolve(context.extensionPath, "webview/index.html");

    /** Path to the last saved image **/
    let lastUsedImageUri = vscode.Uri.file(
        path.resolve(os.homedir(), "Desktop/code.png"),
    );
    let panel;

    /** Regiseter Webview Pannl Serializer **/
    vscode.window.registerWebviewPanelSerializer(
        "screenify", {
            async deserializeWebviewPanel(_panel, state) {
                panel = _panel;
                panel.webview.html = await readHtml(htmlPath, _panel);
                panel.webview.postMessage({
                    type: "restore",
                    innerHTML: state.innerHTML,
                    bgColor: context.globalState.get("screenify.bgColor", "#2e3440"),
                });
                const selectionListener = setupSelectionSync();
                panel.onDidDispose(() => {
                    selectionListener.dispose();
                });
                setupMessageListeners();
            },
        },
    );

    /** Regiseter Screenify Acitivation Command **/
    vscode.commands.registerCommand("screenify.activate", async() => {
        /** Show welcome inforamation message **/
        vscode.window.showInformationMessage(
            "Screenify is enabled and running, happy shooting 📸 😊 ",
        );

        /** Creates Webview Panel  **/
        panel = vscode.window.createWebviewPanel("screenify", P_TITLE, 2, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.file(path.join(context.extensionPath, "webview")),
            ],
        });

        /** Set webview Html content from the html path file **/
        panel.webview.html = await readHtml(htmlPath, panel);

        /** Selcetion Listener **/
        const selectionListener = setupSelectionSync();
        panel.onDidDispose(() => {
            selectionListener.dispose();
        });

        setupMessageListeners();

        /** Get fontFamily from the editor configuration **/
        const fontFamily = vscode.workspace.getConfiguration("editor").fontFamily;

        /** Get bgColor and if NULL set it to #2e3440 **/
        const bgColor = context.globalState.get("screenify.bgColor", "#2e3440");

        /** Post resquest to webview **/
        panel.webview.postMessage({
            type: "init",
            fontFamily,
            bgColor,
        });
        syncSettings();
    });

    /** Syncs Updates **/
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (
            e.affectsConfiguration("screenify") || e.affectsConfiguration("editor")
        ) {
            syncSettings();
        }
    });

    /**
     * Copyies serial blob to the clipboard or uploads the blob to CDN uploaders
     * @param {Blob} serializedBlobHandler 
     * @return {Promise} 
     */
    function serializedBlobHandler(serializeBlob, isUpload) {
        /** if blob is undefined  */
        if (!serializeBlob) return;

        /** Convert Serialize Blob to array of butes **/
        const bytes = new Uint8Array(serializeBlob.split(","));

        /** uploads state is true, then uploads the blob **/
        if (isUpload) return upload(serializeBlob);

        /** else it will copy the blob to clipboard **/
        return copyImg(Buffer.from(bytes));
    }

    /**
     * Saves blob to into file
     * @param {Blob} serializeBlob 
     * @return {Promise} 
     */
    function writeSerializedBlobToFile(serializeBlob, fileName) {
        /** Convert Serialize Blob to array of butes **/
        const bytes = new Uint8Array(serializeBlob.split(","));

        /** write buffer into file **/
        fs.writeFileSync(fileName, Buffer.from(bytes));
    }

    function setupMessageListeners() {
        panel.webview.onDidReceiveMessage(({
            type,
            data,
        }) => {
            switch (type) {
                /** Save the image locally **/
                case "shoot":
                    vscode.window
                        .showSaveDialog({
                            defaultUri: lastUsedImageUri,
                            filters: {
                                Images: ["png"],
                            },
                        })
                        .then((uri) => {
                            if (uri) {
                                writeSerializedBlobToFile(data.serializedBlob, uri.fsPath);
                                vscode.window.showInformationMessage("Snippet saved ✅");
                                lastUsedImageUri = uri;
                            }
                        });
                    break;

                    /** Copy image to the clipboard **/

                case "copy":
                    serializedBlobHandler(data.serializedBlob, data.upload)
                        .then(() => {
                            vscode.window.showInformationMessage(
                                "Snippet copied! 📋 ctrl + V to paste",
                                "Close",
                            );
                        })
                        .catch((err) => {
                            vscode.window.showErrorMessage(
                                `Ops! Something went wrong! ❌: ${err}`,
                                "Close",
                            );
                        });
                    break;

                    /** Updates Cache Settings **/

                case "getAndUpdateCacheAndSettings":
                    panel.webview.postMessage({
                        type: "restoreBgColor",
                        bgColor: context.globalState.get("screenify.bgColor", "#2e3440"),
                    });

                    syncSettings();
                    break;
                case "updateBgColor":
                    context.globalState.update("screenify.bgColor", data.bgColor);
                    break;
                case "invalidPasteContent":
                    vscode.window.showInformationMessage(
                        "Pasted content is invalid. Only copy from VS Code and check if your shortcuts for copy/paste have conflicts.",
                    );
                    break;
            }
        });
    }

    function syncSettings() {
        const settings = vscode.workspace.getConfiguration("screenify");
        const editorSettings = vscode.workspace.getConfiguration("editor", null);
        panel.webview.postMessage({
            type: "updateSettings",
            shadow: settings.get("shadow"),
            transparentBackground: settings.get("transparentBackground"),
            backgroundColor: settings.get("backgroundColor"),
            target: settings.get("target"),
            ligature: editorSettings.get("fontLigatures"),
        });
    }

    function setupSelectionSync() {
        return vscode.window.onDidChangeTextEditorSelection((e) => {
            if (e.selections[0] && !e.selections[0].isEmpty) {
                vscode.commands.executeCommand(
                    "editor.action.clipboardCopyWithSyntaxHighlightingAction",
                );
                panel.postMessage({
                    type: "update",
                });
            }
        });
    }

    /**
     * @function upload
     * @param {Buffer} image 
     * @return {Promise} 
     * Sends Http requset  to screenify backend API to upload the image online. 
     */
    function upload(buffer) {
        /** Server Url **/
        let serverUrl = `https://${settings.get("serverUrl")}/api/upload`;

        /** Show a progress loader... **/
        vscode.window.withProgress({
                location: 15,
                title: "Uploading Image...",
            }, (progress, token) => {
                token.onCancellationRequested(() => {
                    return;
                });

                /** Sending POST requset send with image buffer as the body **/
                return fetch(serverUrl, {
                    method: "POST",
                    body: JSON.stringify({
                        buffer,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            })
            /** convert the response into JSON **/
            .then((res) => res.json())
            .then((response) => {
                const {
                    url,
                } = response;

                /** Copy url to the clipboard **/
                vscode.env.clipboard.writeText(url)
                    .then(() => {
                        /** Sends post message with the uploaded image url to webview api **/
                        panel.webview.postMessage({
                            type: "successfulUplaod",
                            url,
                        });

                        /** Sucessful Upload info message **/
                        vscode.window.showInformationMessage(
                            `Snippet uploaded! ✅    Url is copied to the clipboard 📋: `,
                            url,
                            "Copy",
                        );
                    });
            })
            .catch((err) => {
                /** Error message **/
                vscode.window.showErrorMessage(
                    `Ops! Something went wrong! ❌: ${err}`,
                    "Close",
                );
            });
    }
}

/** Get Screenify settings  **/
const settings = vscode.workspace.getConfiguration("screenify");

/** Extension Decativation **/
function deactivate() {
    // TODO:complete implementing extension deactivation routine
    // #1 Clear cache
    // #2 Garbage collection
}

exports.activate = activate;
exports.deactivate = deactivate;
