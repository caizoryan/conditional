import PDFDocument from 'pdfkit'
import fs from 'fs'

let side = 'left'
let inch = v => v * 72
let highlightColor = [0, 0, 100, 0]
let textFont = './marist.ttf'
let monoFont = './monument_mono_medium.otf'
let color = [100, 50, 0, 0]
highlightColor = [0, 100, 0, 0]


let Grid = props => {
	let columnWidth = (() => {
		let n = 1
		let w = props.spreadWidth/2 - (props.margin.inside + props.margin.outside);
		let g = (n - 1) * props.gutter
		return ((w - (props.gutter * (props.columns - 1))) / props.columns) * n + g;
	})()

	let leftPadding = 
		(props.pageWidth - props.spreadWidth)/2

	let topPadding = 
		(props.pageHeight - props.spreadHeight)/2

	let rectoColumns = (() => {
		const cols = []

		for (let i = 0; i < props.columns; i++) {
			const y = topPadding + props.margin.top
			const w = columnWidth

			// outside + gutters + size
			const x = 
				leftPadding
				+ props.spreadWidth/2
				+ props.margin.inside
				+ (i * props.gutter) + i * columnWidth;
			const h = props.spreadHeight
				- (props.margin.top + props.margin.bottom)

			cols.push({ x, y, w, h })
		}

		return cols
	})()

	let versoColumns = (() => {
		/**@type {{x:number, y:number, w:number, h: number}[]}*/
		const cols = []

		for (let i = 0; i < props.columns; i++) {
			const y = topPadding + props.margin.top 
			const w = columnWidth

			// outside + gutters + size
			const x = leftPadding
				+ props.margin.outside 
				+ i * props.gutter 
				+ i * columnWidth;
			const h = props.spreadHeight
				- (props.margin.top + props.margin.bottom)

			cols.push({ x, y, w, h })
		}

		return cols
	})()

	return {
		props,
		leftPadding,topPadding,
		hanglines: props.hanglines.map(e => e+topPadding),
		rectoColumns, versoColumns,
		columns: [rectoColumns, versoColumns],
		columnWidth
	}
}

let grid = Grid({
	margin: {
		top: inch(1/4),
		bottom: inch(1 / 2),
		inside: inch(1 / 3),
		outside: inch(1 / 4),
	},

	gutter: inch(.125/2),
	columns: 10,
	hanglines: [
		inch(.5),
		inch(.5+2/3),

		inch(1.5),
		inch(1.5 + 2 / 3),

		inch(2.5),
		inch(2.5 + 2 / 3),

		inch(3.5),
		inch(3.5 + 2 / 3),
	],

	spreadWidth: inch(9),
	spreadHeight: inch(7),

	pageWidth: inch(11),
	pageHeight: inch(8.5)
})

function random(min, max) {
  return Math.random() * (max - min) + min;
}

let randomGrid = () => {
	if (Math.random() > .5){
		return {
			type: 'quadtree',
			pageWidth: inch(11),
			pageHeight: inch(8.5),
			points: Array(Math.floor(random(8, 100))).fill(0).map((e, i) => {
				return {x: random(0, inch(11)), y: random(0, inch(8.5))}
			})
		}
	}

	let randLow = () => random(1,4)
	let randMed = () => random(1,8)
	let randHigh = () => random(1,16)
	let hangStart = inch(random(0,2))
	let hangDiff = inch(random(0,2))
	let count = Math.floor(random(2,14))

	let lines = Array(count).fill(0).map((e, i) => hangStart+(i*hangDiff))
	
	let grid = Grid({
		margin: {
			top: inch(randLow()/randMed()),
			bottom: inch(randLow()/randMed()),
			inside: inch(randLow()/randMed()),
			outside: inch(randLow()/randMed()),
		},

		gutter: inch(1/random(1,8)),
		columns: random(2,24),
		hanglines: lines,
		spreadWidth: inch(8.5),
		spreadHeight: inch(5.5),

		pageWidth: inch(11),
		pageHeight: inch(8.5)
	})

	return grid
}

let drawQuadTree = (doc, grid) => {
	let qt = QuadTree(Rectangle(0,0, grid.pageWidth, grid.pageHeight), 1)
	grid.points.forEach(e => qt.insert(e))
	let rects = qt.rects()
	let upper1 = (val) => String(val).charAt(0).toUpperCase() + String(val).slice(1)
	rects.forEach(e => drawRectDocFn({
		x: e.x,
		y: e.y,
		width:  e.w ,
		height: e.h,
		stroke: grid.strokeColor,
		strokeWeight: grid.strokeWeight,
	})(doc))

	// if (props.drawPoints) {
	// 	draw.push(...props.points.map(e => ["Circle", {x: e.x, y: e.y, fill: props.strokeColor, radius: 2}]))
	// }
}

function QuadTree(boundary, n){
	let capacity = n
	let root = {}
	let points = []
	root.divided = false

	let subdivide = () => {
    let x = boundary.x; // now top-left x
    let y = boundary.y; // now top-left y
    let w = boundary.w; // full width
    let h = boundary.h; // full height

    let halfW = w / 2;
    let halfH = h / 2;

    let nwb = Rectangle(x, y, halfW, halfH);
    root.nw = QuadTree(nwb, capacity);

    let neb = Rectangle(x + halfW, y, halfW, halfH);
    root.ne = QuadTree(neb, capacity);

    let swb = Rectangle(x, y + halfH, halfW, halfH);
    root.sw = QuadTree(swb, capacity);

    let seb = Rectangle(x + halfW, y + halfH, halfW, halfH);
    root.se = QuadTree(seb, capacity);
	};

	let insert = (point) => {
		if (!boundary.contains(point)){ return }

		if (points.length < capacity){
			points.push(point)
		}

		else {
			if (!root.divided){
				subdivide()
				root.divided=true
			}

			root.nw.insert(point)
			root.ne.insert(point)
			root.se.insert(point)
			root.sw.insert(point)
		}
	}

	let rects = () => {
		let b = []
		b.push(boundary)
		if (root.divided){
			b.push(...root.nw.rects())
			b.push(...root.ne.rects())
			b.push(...root.sw.rects())
			b.push(...root.se.rects())
		}

		return b.flat()
	}


	root.insert = insert
	root.points = points
	root.boundary = boundary
	root.rects = rects

	return root
}

function Rectangle(x, y, w, h) {
	let contains = (point) => {
    return (
			point.x >= x &&
			point.x <= x + w &&
			point.y >= y &&
			point.y <= y + h
    );
	};
	return { x, y, w, h, contains }
}


let draw_grid = (doc, grid, opts) => {
	let strokeWeight = random(.25, .4)
	let strokeColor = [0, random(25,100), random(25,85),  0]

	if (grid.type 
		&& 
		grid.type == 'quadtree'){
		grid.strokeColor = strokeColor
		grid.strokeWeight = strokeWeight
		drawQuadTree(doc, grid, opts)
		return
	}
	let [recto, verso] = grid.columns


	if (opts.frame) {
		let g = grid
		let bg = 'black'

		doc.rect( 0, 0, g.leftPadding, g.props.pageHeight,)
		doc.fill(bg)

		doc.rect( 0, 0, g.leftPadding, g.topPadding)
		doc.fill(bg)

		doc.rect(g.leftPadding+g.props.spreadWidth, 0, g.leftPadding, g.props.pageHeight,)
		doc.fill(bg)

		doc.rect(0, g.topPadding+g.props.spreadHeight, g.props.pageWidth, g.topPadding,)
		doc.fill(bg)

		doc.rect(0, 0, g.props.pageWidth, g.topPadding,)
		doc.fill(bg)
	}

	if (opts.drawGrid){
		doc.lineWidth(strokeWeight)
		doc.strokeColor(strokeColor)

		grid.hanglines.forEach(e => {
			drawLineDocFn({
				points: [{ x: 0, y: e }, { x: grid.props.pageWidth, y: e }],
				stroke: [0, 50, 0, 0],
				strokeStyle: [2],
				strokeWeight: .5,
			})(doc)

		})
		recto.forEach((col) => {
			doc.rect(col.x, col.y, col.w, col.h)
			doc.stroke()
		})

		verso.forEach((col) => {
			doc.rect(col.x, col.y, col.w, col.h)
			doc.stroke()
		})
	}

	if (opts.crops) {
		let g = grid
		drawLineDocFn({
			points: [
				{ x: g.leftPadding - 10, y: g.topPadding },
				{ x: g.leftPadding - 3,  y: g.topPadding }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding, y: g.topPadding - 10 },
				{ x: g.leftPadding, y: g.topPadding - 3 }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding + g.props.spreadWidth + 3, y: g.topPadding },
				{ x: g.leftPadding + g.props.spreadWidth + 10, y: g.topPadding }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding + g.props.spreadWidth, y: g.topPadding - 10 },
				{ x: g.leftPadding + g.props.spreadWidth, y: g.topPadding - 3 }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding + g.props.spreadWidth, y: g.topPadding + g.props.spreadHeight + 3 },
				{ x: g.leftPadding + g.props.spreadWidth, y: g.topPadding + g.props.spreadHeight + 10 }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding + g.props.spreadWidth + 3, y: g.topPadding + g.props.spreadHeight },
				{ x: g.leftPadding + g.props.spreadWidth + 10, y: g.topPadding + g.props.spreadHeight }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding - 10, y: g.topPadding + g.props.spreadHeight },
				{ x: g.leftPadding - 3,  y: g.topPadding + g.props.spreadHeight }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);

		drawLineDocFn({
			points: [
				{ x: g.leftPadding, y: g.topPadding + g.props.spreadHeight + 3 },
				{ x: g.leftPadding, y: g.topPadding + g.props.spreadHeight + 10 }
			],
			stroke: 'black',
			strokeWeight: 1,
		})(doc);
	}
}


let blankpage = (doc) => draw_grid(doc, randomGrid(), {crops: true, drawGrid: true})		

let hookPage = (doc, index, options) => {
	draw_grid(doc, grid, {crops: true})		
	let text = options.text
	let columns = grid.versoColumns
	index % 2 == 0 ? columns = grid.rectoColumns : columns = grid.versoColumns

	drawTextDocFn({
		x: columns[1].x,
		y: grid.hanglines[2],
		width: inch(3.5),
		fontSize: 8,
		text: options.description,
		fontFamily: './monument_mono_regular.otf'
	})(doc)

	drawLineDocFn({
		points: [
			{ x: columns[1].x-3, y: grid.hanglines[2]-8, },
			{ x: columns[9].x, y: grid.hanglines[2]-8, }
		],
		strokeWeight: 2,
		stroke:'black',
	})(doc)

	drawLineDocFn({
		points: [
			{ x: columns[1].x-3, y: grid.hanglines[6]-8, },
			{ x: columns[9].x, y: grid.hanglines[6]-8, }
		],
		strokeWeight: .2,
		stroke:'black',
	})(doc)

	let lines = ParagraphStepper(doc, {
		text,
		x: columns[1].x,
		y: grid.hanglines[6],
		width: inch(2.8),
		height: inch(2),
		hook: options.hook,
		fontSize: 9,
		fontFamily: './marist.ttf'
	})

	lines.forEach(e => {
		if (e[0] == 'Text'){ 
			drawTextDocFn(e[1])(doc) 
		}
	})
}

let stylesheet = (doc, t) => Object.entries(t).forEach(([k, v]) => doc[k](v))

let page_number = 1

let data = [
		{
			description: 'Size mapped to word length',
			text: `Distribute the software not as a clean code base to be used but rather as a tutorial to make it yourself. So the person whoever uses this tool can fix it, edit it and change it rather than relying on updates from a developer. Think of making a repl/code editor on a webpage and have interactive tutorial for it.`,
			hook: (opts,word) => {  opts.fontSize = word.length/3+6 } 
		},

		{
			description: 'Weight inversely mapped to word length',
			text: `FoldFace is a an obtusely simple file format for defining typefaces. Typefaces can be designed by folding thin and long strips of paper and logging the fold points into a FoldFace Editor. A FoldFace file can be run to output an .otf or .ttf file. The FoldFace specification outlines the structure for reading and writing a FoldFace file so anyone interested to can implement their own editor, or iterate on existing ones.`,
			hook: (opts,word) => {
				if (word.length > 6) opts.fontFamily = './favorit/ABCFavorit-Bold-Trial.otf' 
				else if (word.length > 3) opts.fontFamily = './favorit/ABCFavorit-Medium-Trial.otf'
				else opts.fontFamily = './favorit/ABCFavorit-Light-Trial.otf'
			} 
		},

		{
			description: 'Weight mapped to word length',
			text: `FoldFace is a an obtusely simple file format for defining typefaces. Typefaces can be designed by folding thin and long strips of paper and logging the fold points into a FoldFace Editor. A FoldFace file can be run to output an .otf or .ttf file. The FoldFace specification outlines the structure for reading and writing a FoldFace file so anyone interested to can implement their own editor, or iterate on existing ones.`,
			hook: (opts,word) => {
				if (word.length > 6) opts.fontFamily = './favorit/ABCFavorit-Light-Trial.otf' 
				else if (word.length > 3) opts.fontFamily = './favorit/ABCFavorit-Medium-Trial.otf'
				else opts.fontFamily = './favorit/ABCFavorit-Bold-Trial.otf'
			} 
		}
]


let spreads = [
	[ 
		(doc) => hookPage(doc, 0, data[0]),
	],

	[
		(doc) => hookPage(doc, 1, data[1]),
		(doc) => hookPage(doc, 2, data[2])
	]


]

// for(let i = 0; i < 52; i++){
// 	spreads.push([defaultPage])
// }


let page_number_fn = (page_number) => (doc) => {
	let pg = page_number
	doc.fontSize(9)
	doc.fillColor([0, 0, 0, 45])
	if (pg - 1 != 0) doc.text((pg - 1) + '', grid.versoColumns[1].x, grid.topPadding+inch(.125))
	doc.text((pg) + '', grid.rectoColumns[2].x, grid.topPadding+inch(.125))

	let off = page_number
	if (side == 'right') off = off - 90
	let yOff = off / 2


	doc.restore()
}


let ParagraphStepper = (doc, props) => {
	props.fontFamily ? doc.font(props.fontFamily):null
	props.fontSize ? doc.fontSize(props.fontSize):null
	let align = props.align ? props.align : 'left'

	let lines = [ ]
	let words = props.text.split(" ")
	let leading = props.leading ? props.leading : 12
	let cursorY = props.y
	let cursorX = props.x
	let crossed = false

	let currentWord = ''
	let currentWordWidth = ""

	// let 
	while (words.length > 0 && cursorY < (props.y + props.height)) {
		crossed = false
		let lineOpts = { 
			words, x: props.x,
			y: cursorY,
			width: props.width, 
			align, hook: props.hook

		}
		if (props.fontFamily) lineOpts.fontFamily = props.fontFamily
		if (props.fontSize) lineOpts.fontSize = props.fontSize

		let leftOvers = Line(doc, lineOpts)
		lines.push(...leftOvers.draw)
		cursorX = leftOvers.cursorX
		crossed = leftOvers.crossed
		currentWord = leftOvers.currentWord
		currentWordWidth = leftOvers.currentWordWidth.toFixed(1)
		cursorY += leading

	}

	return lines
}


let Line = (doc, props) => {
	let words = props.words
	let cursorX = props.x
	let drawables = []
	let crossed = false

	let currentWord = ''
	let currentWordWidth = 0
	let spaceWidth
	let pad
	let textFont = props.fontFamily

	while (words.length > 0 && cursorX < (props.x + props.width)  ) {
		let word = words.shift()
		if (!word) break


		let opts = {
			x: cursorX,
			y: props.y,
			text: word,
			fill: 'black',
			fontFamily: textFont,
		}

		if (props.fontFamily) opts.fontFamily = props.fontFamily
		if (props.fontSize) opts.fontSize = props.fontSize

		// if (word.length > 4) opts.fontFamily = ''
		if (props.hook) {
			props.hook(opts, word)
		}

		if (opts.fontSize) doc.fontSize(opts.fontSize)
		if (opts.fontFamily) doc.font(opts.fontFamily)

		let width = doc.widthOfString(word, opts)
	  spaceWidth = doc.widthOfString(" ", opts)

		cursorX += width
		currentWord = word
		currentWordWidth = width + spaceWidth

		// rectOpts.fill = [0, 0, 80, 0]

	  pad = props.x + props.width - cursorX 


		cursorX += spaceWidth

		drawables.push(["Text", opts])

		if (cursorX > props.x + props.width ) {
			cursorX -= spaceWidth
			break
		}
	}

	return {
		draw: drawables,
		crossed,
		words, cursorX,
		currentWord,
		currentWordWidth,

	}
}


spreads.forEach((e, i) => {
	// if (i < 2) return
	let fn = page_number_fn(page_number, side)
	e.push(fn)
	page_number += 2
})


let siggies = []
let vals = []
for (let i = 0; i < 8; i++) {
	vals.push([(i*10) + (i == 0 ? 0 : 2), ((i+1)*10)+3])
	siggies.push(spreads.slice(...vals[i]))
}

let writeSpreads = (spreads, filename) => {
	const doc = new PDFDocument({ layout: 'landscape' });
	doc.pipe(fs.createWriteStream(filename));

	spreads.forEach((spread, i) => {
		// doc.save()
		// doc.translate(inch(.5), inch(.5))

		spread.forEach(item => {
			item(doc)
		})

		// doc.restore()
		if (i != spreads.length - 1) doc.addPage()
	})

	doc.end();
}

let recto_image = (doc, spread, spreads) => {
	doc
		.save()
		.rect(inch(5.5), 0, inch(5.5), inch(8.5))
		.clip()
	spreads[spread].forEach(item => {
		item(doc)
	})
	doc.restore()
}
let verso_image = (doc, spread, spreads) => {
	doc
		.save()
		.rect(0, 0, inch(5.5), inch(8.5))
		.clip()

	spreads[spread].forEach(item => {
		item(doc)
	})

	doc.restore()
}

let pageImage = (doc, spreadNum, spreads) => {
	let spread = Math.floor(spreadNum / 2)
	return spreadNum % 2 == 1
		? recto_image(doc, spread, spreads)
		: verso_image(doc, spread, spreads)
}

let pages = (spreadcount) => {
	if (spreadcount % 2 == 1) {
		return Array(spreadcount).fill(undefined)
			.reduce((acc, _, i) =>
				(acc.push([i * 2, i == spreadcount - 1 ? 0 : i * 2 + 1]), acc), [])
	}

	else console.log("FUCK NOT MULTIPLE OF 4", (spreadcount * 2) - 2)
}
let imposedPages = (pagesArray) => {
	let spreadCount = pagesArray.length
	if (spreadCount % 2 != 1) {
		console.error("FUCK NOT MULTIPLE OF 4", (spreadCount * 2) - 2)
	}
	// get pages
	let last = pagesArray.length - 1
	let pair = (i) => pagesArray[last - i]
	let pairskiplast = (i) => pagesArray[last - i - 1]

	let middle = Math.ceil(last / 2)

	// switch each recto with pair spread recto till middle
	for (let i = 0; i < middle; i++) {
		let f_verso = pagesArray[i][0]
		let p_verso = pair(i)[0]

		pagesArray[i][0] = p_verso
		pair(i)[0] = f_verso
	}

	let pairedup = []

	// pair spreads up with each other
	for (let i = 0; i < middle; i++) {
		pairedup.push(pagesArray[i])
		pairedup.push(pairskiplast(i))
	}

	return pairedup
}

let drawCircleDocFn = (props) => (doc) => {
	doc.save();
	if (props.strokeWeight) doc.lineWidth(props.strokeWeight);
	let x = props.x ? props.x : 0;
	let y = props.y ? props.y : 0;
	doc.circle(x, y, props.radius ? props.radius : 5);
	if (props.stroke && props.fill) doc.fillAndStroke(props.fill, props.stroke);
	else {
		if (props.stroke) doc.stroke(props.stroke);
		if (props.fill) doc.fill(props.fill);
	}

	doc.restore();
};

let drawTextDocFn = (props) => (doc) => {
	doc.save();
	let x = props.x;
	let y = props.y;
	let width = props.width ? props.width : 100;
	let height = props.height ? props.height : 100;
	let text = props.text;
	let fontSize = props.fontSize ? props.fontSize : 12;
	let fontFamily = props.fontFamily;
	// let stroke = props.stroke ? true : false;

	if (props.fill) doc.fillColor(props.fill);
	if (fontFamily) doc.font(fontFamily);
	// if (props.stroke) doc.stroke(props.stroke);
	doc.fontSize(fontSize);
	doc.text(text, x, y, { width, height });

	if (props.boundingBox) {
		doc.rect(x, y, width, height);
		doc.lineWidth(props.boundingBox);

		if (props.boundingBoxFill) {
			doc.fill(props.boundingBox);
		}
		else {
			doc.stroke('black');
		}
	}
	// if (props.stroke && props.fill) doc.fillAndStroke(props.fill, props.stroke);

	doc.restore();
};

let drawImageDocFn = (props) => (doc) => {
	// return;
	doc.save();
	let x = props.x;
	let y = props.y;
	let image = props.image;

	let width = props.width ? props.width : 100;

	if (!props.image) return;
	if (props.fill) doc.fillColor(props.fill);
	// if (props.stroke) doc.stroke(props.stroke);
	doc.image(image, x, y, { width });
	// if (props.stroke && props.fill) doc.fillAndStroke(props.fill, props.stroke);
	// else {
	// }

	doc.restore();
};

let drawImageCanvasFn = (props) => (ctx, canvas) => {
	let x = props.x;
	let y = props.y;
	let image = props.image;

	let width = props.width ? props.width : 100;

	if (!props.image) return;
	if (props.fill) doc.fillColor(props.fill);
	const ratio = img.height / img.width;
	const targetHeight = targetWidth * ratio;

	canvas.width = targetWidth;
	canvas.height = targetHeight;

	ctx.drawImage(img, x, y, targetWidth, targetHeight);
};

let drawLineDocFn = (props) => (doc) => {
	let points = props.points;
	if (props.points.length < 2) return;
	if (props.strokeStyle) doc.dash(props.strokeStyle[0])
	if (props.lineCap) doc.lineCap(props.lineCap)
	if (props.lineJoin) doc.lineJoin(props.lineJoin)
	// let start = points[0];
	// let x1 = start.x;
	// let y1 = start.y;
	//
	// let end = points[1];
	// let x2 = end.x;
	// let y2 = end.y;

	doc.save();
	doc.lineWidth(props.strokeWeight);
	doc.moveTo(points[0].x, points[0].y);
	points.slice(1).filter((e) =>
		e != undefined &&
		typeof e == "object"
	).forEach(
		(e) => doc.lineTo(e.x, e.y),
	);
	// .lineTo(x2, y2);
	if (props.stroke) doc.stroke(props.stroke);
	doc.restore();
	doc.undash()
};

let drawRectDocFn = (props) => (doc) => {
	doc.save();
	if (props.strokeWeight) doc.lineWidth(props.strokeWeight);
	let x = props.x ? props.x : 0;
	let y = props.y ? props.y : 0;
	let width = props.width ? props.width : 0;
	let height = props.height ? props.height : 0;
	doc.rect(x, y, width, height);
	if (props.strokeStyle) doc.dash(props.strokeStyle[0])
	if (props.stroke && props.fill) doc.fillAndStroke(props.fill, props.stroke);
	else {
		if (props.stroke) doc.stroke(props.stroke);
		if (props.fill) doc.fill(props.fill);
	}

	doc.restore();
};

let runa = (doc, drawables) => {
	let fns = {
		"Circle": drawCircleDocFn,
		"Text": drawTextDocFn,
		"Image": drawImageDocFn,
		"Rect": drawRectDocFn,
		"Line": drawLineDocFn,
		"Group": (props) => (doc) => {
			let drawables = props.draw ? props.draw : [];

			drawables.forEach((fn) => {
				if (!fn) return;
				 typeof fn[0] == 'function' 
					? fn[0](doc):
						typeof fns[fn[0]] == "function"
						? fns[fn[0]](fn[1])(doc)
							: console.log("ERROR: Neither a fn nor a key")
			});
		},
	};

	fns.Group({ draw: drawables })(doc);
}

let writeSignature = (signature, filename) => {
	const doc = new PDFDocument({ layout: 'landscape' });
	doc.pipe(fs.createWriteStream(filename));

	let pgs = pages(signature.length)
	let imposed_pages = imposedPages(pgs)
	imposed_pages.forEach(([v, r], i) => {
		pageImage(doc, v, signature)
		pageImage(doc, r, signature)
		if (i != imposed_pages.length - 1) doc.addPage()
	})

	doc.end();
}

let printing = false
if (printing) {
	siggies.forEach((e, i) => writeSignature(e, "signature_"+i+'.pdf'))
	// writeSignature(signature1, side+'_aligned1.pdf')
	// writeSignature(signature2, side+'_aligned2.pdf')
	// writeSignature(signature3, side+'_aligned3.pdf')
	// writeSignature(signature4, side+'_aligned4.pdf')
	// writeSignature(signature5, 'zine_signature5.pdf')
}
else writeSpreads(spreads, "test.pdf")


