import { StatusBarAlignment, window, WebviewPanel, ExtensionContext, workspace } from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface Cache {
	[key: string]: {
		line: number;
		timesteps: TimeCode[]
	}
}

interface DayMap {
	[key: string]: {
		[key: string]: number
	}
}

interface TimeCode {
	startTime: number;
	endTime: number | null;
}
class DailyLine {
	cache: Cache;
	dayMap: DayMap;
	context: ExtensionContext;
	cachePath: string;
	statusBar: StatusBarItem;
	htmlPath: string;
	timer: number | null;
	panel: WebviewPanel | null;
	static INTERVAL = 1000 * 60 * 3;
	constructor() {
		this.panel = null;
		this.cache = {};
		this.dayMap = {};
		this.timer = null;
    }
    init(context: ExtensionContext) {
        this.context = context;
		this.cachePath = context.globalStoragePath;
		this.statusBar = window.createStatusBarItem(StatusBarAlignment.Left);
		this.htmlPath = path.resolve(context.extensionPath, 'webview/index.html');
		this.initCache();
		this.loadCache();
		const today = this.getToday();
		this.checkInit(today);
		this.statusBar.text = `今日已coding ${this.cache[today].line || 0} 行`;
		this.statusBar.show();
	}
	setNewTimer() {
		const today = this.getToday()
		const { timesteps } = this.cache[today];
		if (!this.timer) {
			timesteps.push({
				startTime: +new Date(),
				endTime: null
			})
			this.syncLocal();
		}
		if (this.timer) {
			clearTimeout(this.timer);
		}
		this.timer = setTimeout(() => {
			const { timesteps } = this.cache[today];
			const lastcode = timesteps[timesteps.length - 1];

			if (!lastcode.endTime) {
				lastcode.endTime = Date.now();
			}

			if ((lastcode.endTime + DailyLine.INTERVAL) < Date.now()) {
				lastcode.endTime = Date.now();
			}

			this.syncLocal();
			clearTimeout(this.timer);
			this.timer = null;
		}, DailyLine.INTERVAL);
	}
	computedTime(): number {
		const today = this.getToday()
		const { timesteps } = this.cache[today];
		return timesteps.reduce((totalTime, timestep ) => {
			if (timestep.endTime) {
				return (timestep.endTime - timestep.startTime) + totalTime;
			}
			const now = Date.now();
			if ((now - timestep.startTime) < DailyLine.INTERVAL) {
				return now - timestep.startTime + totalTime;
			}
			return DailyLine.INTERVAL + totalTime;
		}, 0);
	}
	setPanel(panel: WebviewPanel) {
		this.panel = panel;
	}
	initCache() {
		if (!fs.existsSync(this.cachePath)) {
			fs.writeFileSync(this.cachePath, JSON.stringify(this.cache));
		}
	}
	loadCache() {
		const content = fs.readFileSync(this.cachePath).toString();
		try {
			this.cache = JSON.parse(content);
		} catch (e) {

		}
	}
	getCacheLine() {
		const today = this.getToday();
		return this.cache[today].line;
	}
	getToday() {
		const date = new Date();
		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();
		return `${year}-${(month + 1) >= 10 ? (month + 1) : '0' + (month + 1)}-${day >= 10 ? day : '0' + day}`;
	}
	getLine() {
		let editor = window.activeTextEditor;
		if (!editor) {
			return 0;
		}
		const content = editor.document.getText();
		const lastLine = content.split(/\r?\n/);
		return lastLine.length;
	}
	open() {
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		const fileName = editor.document.fileName;
		if (!fileName) {
			return;
		}
		const today = this.getToday();
		this.checkInit(today);
		this.dayMap[today][fileName] = this.getLine();
	}
	checkInit(today: string) {
		if (!this.cache[today]) {
			this.cache[today] = {
				line: 0,
				timesteps: []
			};
		}
		if (!this.dayMap[today]) {
			this.dayMap[today] = {};
		}
	}
	checkInitFile(today: string, fileName: string) {
		if (!this.dayMap[today][fileName]) {
			this.dayMap[today][fileName] = this.getLine();
		}
	}
	save() {
		this.loadCache();
		const today = this.getToday();
		this.checkInit(today);
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		const fileName = editor.document.fileName;
		if (!fileName) {
			return;
		}
		const saveLine = this.getLine();
		this.checkInitFile(today, fileName);
		const addcode = saveLine - this.dayMap[today][fileName];
		if (addcode > 0) {
			this.dayMap[today][fileName] = saveLine;
			this.cache[today].line += addcode;
			this.syncLocal()
			this.statusBar.text = `今日coding ${this.cache[today].line} 行`;
			if (this.panel) {
				this.setcode();
			}
		}
	}
	syncLocal() {
		fs.writeFileSync(this.cachePath, JSON.stringify(this.cache));
	}
	setcode() {
		const panel = this.panel;
		const line = this.getCacheLine();
		const day = this.getToday();
		const time = this.computedTime();
		const fontFamily = workspace.getConfiguration('editor').fontFamily;
		const msg = {
			type: 'update',
			line,
			fontFamily,
			bgColor: '#2e3440',
			time,
			day
		};
		panel.webview.postMessage(msg);
	}
	dispose() {

	}
}

export default DailyLine;