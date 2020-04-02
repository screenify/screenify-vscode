define(["require", "exports"], function (require, exports) {
    /**
     * Helper to use the Command Line Interface (CLI) easily with both Windows and Unix environments.
     * Requires underscore or lodash as global through "_".
     */
    var Cli = (function () {
        function Cli() {}
        /**
         * Execute a CLI command.
         * Manage Windows and Unix environment and try to execute the command on both env if fails.
         * Order: Windows -> Unix.
         *
         * @param command                   Command to execute. ('grunt')
         * @param args                      Args of the command. ('watch')
         * @param callback                  Success.
         * @param callbackErrorWindows      Failure on Windows env.
         * @param callbackErrorUnix         Failure on Unix env.
         */
        Cli.execute = function (command, args, callback, callbackErrorWindows, callbackErrorUnix) {
            if (typeof args === "undefined") {
                args = [];
            }
            Cli.windows(command, args, callback, function () {
                callbackErrorWindows();

                try {
                    Cli.unix(command, args, callback, callbackErrorUnix);
                } catch (e) {
                    console.log('------------- Failed to perform the command: "' + command + '" on all environments. -------------');
                }
            });
        };

        /**
         * Execute a command on Windows environment.
         *
         * @param command       Command to execute. ('grunt')
         * @param args          Args of the command. ('watch')
         * @param callback      Success callback.
         * @param callbackError Failure callback.
         */
        Cli.windows = function (command, args, callback, callbackError) {
            if (typeof args === "undefined") {
                args = [];
            }
            try {
                Cli._execute(process.env.comspec, _.union(['/c', command], args));
                callback(command, args, 'Windows');
            } catch (e) {
                callbackError(command, args, 'Windows');
            }
        };

        /**
         * Execute a command on Unix environment.
         *
         * @param command       Command to execute. ('grunt')
         * @param args          Args of the command. ('watch')
         * @param callback      Success callback.
         * @param callbackError Failure callback.
         */
        Cli.unix = function (command, args, callback, callbackError) {
            if (typeof args === "undefined") {
                args = [];
            }
            try {
                Cli._execute(command, args);
                callback(command, args, 'Unix');
            } catch (e) {
                callbackError(command, args, 'Unix');
            }
        };

        /**
         * Execute a command no matters what's the environment.
         *
         * @param command   Command to execute. ('grunt')
         * @param args      Args of the command. ('watch')
         * @private
         */
        Cli._execute = function (command, args) {
            var spawn = require('child_process').spawn;
            var childProcess = spawn(command, args);

            childProcess.stdout.on("data", function (data) {
                console.log(data.toString());
            });

            childProcess.stderr.on("data", function (data) {
                console.error(data.toString());
            });
        };
        return Cli;
    })();
    exports.Cli = Cli;
});