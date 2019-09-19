const vscode = require('vscode');
const tab = " ".repeat(vscode.workspace.getConfiguration("editor", null).get("tabSize"));

vscode.languages.registerDocumentFormattingEditProvider("assembly", {
	provideDocumentFormattingEdits(document) {
		const commentSpacing = vscode.workspace.getConfiguration("asmsupport").get("commentSpacing");

		let edits = [];
		let lines = [];
		let longestInstruction = 0;
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const label = /\w+:|\.\w+/.test(line.text);

			let lineObject = {};
			lineObject["range"] = line.range;
			lineObject["label"] = label;

			if (/[^#\W]+.*#/.test(line.text)) {
				const index = line.text.indexOf("#");
				const comment = line.text.substring(index + 1, line.text.length).trim();
				const text = line.text.substring(0, index).trim();

				lineObject["comment"] = comment;
				lineObject["text"] = text;
			} else {
				lineObject["text"] = line.text.trim();
			}

			if (!label) {
				const instruction = lineObject["text"].split(" ")[0];
				lineObject["text"] = lineObject["text"].substring(instruction.length).trim();

				if (instruction.length > longestInstruction && lineObject["text"].length > 0) {
					longestInstruction = instruction.length;
				}

				lineObject["instruction"] = instruction;
			}

			if (line.text.trim().startsWith("#")) {
				edits.push(vscode.TextEdit.replace(line.range, "# " + line.text.trim().substring(1).trimLeft()));
			} else {
				lines.push(lineObject);
			}
		}

		let longestComment = 0;
		for (let line of lines) {
			if (!line["comment"]) {
				continue;
			}

			const length = (line["label"] ? 0 : tab.length) + line["text"].length + 1;
			if (length > longestComment) {
				longestComment = length;
			}
		}

		for (let line of lines) {
			const instruction = line["instruction"] || "";
			const empty = line["text"].length == 0;

			if (empty && instruction.length == 0) {
				edits.push(vscode.TextEdit.replace(line["range"], ""));
			}

			const text =
				line["label"] ?
					line["text"] :
					empty ? tab + instruction :
						tab + instruction + " ".repeat(longestInstruction - instruction.length + 1) + line["text"];

			const extra =
				line["comment"] ?
					" ".repeat(longestComment - text.length + longestInstruction + commentSpacing) + "# " + line["comment"] :
					"";

			edits.push(vscode.TextEdit.replace(line["range"], text + extra));
		}

		return edits;
	}
});