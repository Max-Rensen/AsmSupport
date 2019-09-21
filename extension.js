const vscode = require('vscode');
const tab = " ".repeat(vscode.workspace.getConfiguration("editor", null).get("tabSize"));

// All the bug fixes have made this code horrible and I am too lazy to fix it, please don't look here
vscode.languages.registerDocumentFormattingEditProvider("assembly", {
	provideDocumentFormattingEdits(document) {
		const commentSpacing = vscode.workspace.getConfiguration("asmsupport").get("commentSpacing");

		let edits = [];
		let lines = [];
		let longestInstruction = 0;
		for (let i = 0; i < document.lineCount; i++) {
			const line = document.lineAt(i);
			const text = line.text.trim();
			const label = /\w+:/.test(text);
			const section = /\.\w+/.test(text);

			let lineObject = {};
			lineObject["range"] = line.range;
			lineObject["label"] = label;
			lineObject["section"] = section;

			if (/[^#]+.*#/.test(text)) {
				const index = text.indexOf("#");
				const comment = text.substring(index, text.length).trim();
				const other = text.substring(0, index).trim();

				lineObject["comment"] = comment;
				lineObject["text"] = other;
			} else {
				lineObject["text"] = text;
			}

			if (!label && !section) {
				const instruction = lineObject["text"].split(" ")[0];
				lineObject["text"] = lineObject["text"].substring(instruction.length).trim();

				if (instruction.length > longestInstruction && lineObject["text"].length > 0) {
					longestInstruction = instruction.length;
				}

				lineObject["instruction"] = instruction;
			} else if (label) {
				lineObject["labelSpacing"] = line.text.length - line.text.trimLeft().length;
			}

			if (text.startsWith("#")) {
				edits.push(vscode.TextEdit.replace(line.range, text));
			} else {
				lines.push(lineObject);
			}
		}

		let longestComment = 0;
		let isInstruction = false;
		for (let line of lines) {
			if (!line["comment"]) {
				continue;
			}

			const spacing = line["label"] ? line["labelSpacing"] : (line["section"] ? 0 : tab.length);

			const length = spacing + line["text"].length + ((line["label"] || line["section"]) ? 0 : 1);
			if (length > longestComment) {
				isInstruction = line["instruction"] != null;
				longestComment = length;
			}
		}

		for (let line of lines) {
			const instruction = line["instruction"] || "";
			const empty = line["text"].length == 0;

			if (empty && instruction.length == 0) {
				edits.push(vscode.TextEdit.replace(line["range"], ""));
				continue;
			}

			const text =
				line["label"] ? " ".repeat(line["labelSpacing"]) + line["text"] :
					line["section"] ? line["text"] :
						empty ? tab + instruction :
							tab + instruction + " ".repeat(longestInstruction - instruction.length + 1) + line["text"];

			const instructionLength = (line["instruction"] || ((line["label"] || line["section"]) && empty)) ? (isInstruction ? longestInstruction : 0) : 0;
			const extra =
				line["comment"] ?
					" ".repeat(longestComment - text.length + instructionLength + commentSpacing) + line["comment"] :
					"";

			edits.push(vscode.TextEdit.replace(line["range"], text + extra));
		}

		return edits;
	}
});