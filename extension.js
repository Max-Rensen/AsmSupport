const vscode = require('vscode');
const tab = " ".repeat(vscode.workspace.getConfiguration("editor", null).get("tabSize"));

vscode.languages.registerDocumentFormattingEditProvider("assembly", {
	provideDocumentFormattingEdits(document) {
		const commentSpacing = vscode.workspace.getConfiguration("asmsupport").get("commentSpacing");

		let edits = [];
		let lines = [];
		let longestComment = 0;
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

				if (text.length > longestComment) {
					longestComment = text.length;
				}

				lineObject["comment"] = comment;
				lineObject["commentLength"] = text.length;
				lineObject["text"] = text;
			} else {
				lineObject["text"] = line.text.trim();
			}

			if (!label) {
				const instruction = lineObject["text"].split(" ")[0];
				if (instruction.length > longestInstruction) {
					longestInstruction = instruction.length;
				}
				lineObject["instruction"] = instruction;
				lineObject["text"] = lineObject["text"].substring(instruction.length).trim();
			}

			if (line.text.trim().startsWith("#")) {
				edits.push(vscode.TextEdit.replace(line.range, "# " + line.text.trim().substring(1).trimLeft()));
			} else {
				lines.push(lineObject);
			}
		}

		for (let line of lines) {
			const text =
				line["label"] ?
					line["text"] :
					tab + line["instruction"] + " ".repeat(longestInstruction - line["instruction"].length + 1) + line["text"];

			const extra =
				line["comment"] ?
					" ".repeat(longestComment - line["commentLength"] + (line["label"] ? tab.length : 0) + commentSpacing) + "# " + line["comment"] :
					"";

			edits.push(vscode.TextEdit.replace(line["range"], text + extra));
		}

		return edits;
	}
});