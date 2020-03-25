 window.onload = function () {
   (function () {
     let target = "container";
     /**
      * Requesting vscode-api
      */
     const vscode = acquireVsCodeApi()
     // changed to true
     let transparentBackground = false;
     let backgroundColor = "#f2f2f2";

     vscode.postMessage({
       type: "getAndUpdateCacheAndSettings"
     });

     const snippetNode = document.getElementById("snippet");
     const snippetContainerNode = document.getElementById("snippet-container");
     const obturateur = document.getElementById("save");
     const obturateurLogo = document.getElementById("save_logo");
     const canvas = document.getElementById('my-canvas');
     const ctx = canvas.getContext('2d');
     const brush = document.getElementById("brush");
     const line = document.getElementById("line");
     const circle = document.getElementById("circle");
     const rectangle = document.getElementById("rectangle");
     const color = document.getElementById("color")

     snippetContainerNode.style.opacity = "1";
     const oldState = vscode.getState();
     if (oldState && oldState.innerHTML) {
       snippetNode.innerHTML = oldState.innerHTML;
     }

     const getInitialHtml = fontFamily => {
       const cameraWithFlashEmoji = String.fromCodePoint(128248);
       const monoFontStack = `${fontFamily},SFMono-Regular,Consolas,DejaVu Sans Mono,Ubuntu Mono,Liberation Mono,Menlo,Courier,monospace`;
       return `<meta charset="utf-8"><div style="color: #d8dee9;background-color: #2e3440; font-family: ${monoFontStack};font-weight: normal;font-size: 12px;line-height: 18px;white-space: pre;"><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">0. Run command \`Screenify ${cameraWithFlashEmoji}\`</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">1. Copy some code</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">2. Paste into Screenify view</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div><div><span style="color: #8fbcbb;">console</span><span style="color: #eceff4;">.</span><span style="color: #88c0d0;">log</span><span style="color: #d8dee9;">(</span><span style="color: #eceff4;">'</span><span style="color: #a3be8c;">3. Click the button ${cameraWithFlashEmoji}</span><span style="color: #eceff4;">'</span><span style="color: #d8dee9;">)</span></div></div></div>`;
     };

     const serializeBlob = (blob, cb) => {
       const fileReader = new FileReader();

       fileReader.onload = () => {
         const bytes = new Uint8Array(fileReader.result);
         cb(Array.from(bytes).join(","));
       };

       function getBrightness(color) {
         const rgb = this.toRgb();
         return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
       }
       fileReader.readAsArrayBuffer(blob);
     };

     function shoot(serializedBlob) {
       vscode.postMessage({
         type: "shoot",
         data: {
           serializedBlob
         }
       });
     }

     function getBrightness(hexColor) {
       const rgb = parseInt(hexColor.slice(1), 16);
       const r = (rgb >> 16) & 0xff;
       const g = (rgb >> 8) & 0xff;
       const b = (rgb >> 0) & 0xff;
       return (r * 299 + g * 587 + b * 114) / 1000;
     }

     function isDark(hexColor) {
       return getBrightness(hexColor) < 128;
     }

     function getSnippetBgColor(html) {
       const match = html.match(/background-color: (#[a-fA-F0-9]+)/);
       return match ? match[1] : undefined;
     }

     function updateEnvironment(snippetBgColor) {
       // update snippet bg color
       document.getElementById("snippet").style.backgroundColor = snippetBgColor;

       // update backdrop color
       if (isDark(snippetBgColor)) {
         snippetContainerNode.style.backgroundColor = "#f2f2f2";
       } else {
         snippetContainerNode.style.background = "none";
       }
     }

     function getMinIndent(code) {
       const arr = code.split("\n");

       let minIndentCount = Number.MAX_VALUE;
       for (let i = 0; i < arr.length; i++) {
         const wsCount = arr[i].search(/\S/);
         if (wsCount !== -1) {
           if (wsCount < minIndentCount) {
             minIndentCount = wsCount;
           }
         }
       }

       return minIndentCount;
     }

     function stripInitialIndent(html, indent) {
       const doc = new DOMParser().parseFromString(html, "text/html");
       const initialSpans = doc.querySelectorAll("div > div span:first-child");
       for (let i = 0; i < initialSpans.length; i++) {
         initialSpans[i].textContent = initialSpans[i].textContent.slice(indent);
       }
       return doc.body.innerHTML;
     }

     document.addEventListener("paste", e => {
       const innerHTML = e.clipboardData.getData("text/html");

       const code = e.clipboardData.getData("text/plain");
       const minIndent = getMinIndent(code);

       const snippetBgColor = getSnippetBgColor(innerHTML);
       if (snippetBgColor) {
         vscode.postMessage({
           type: "updateBgColor",
           data: {
             bgColor: snippetBgColor
           }
         });
         updateEnvironment(snippetBgColor);
       }

       if (minIndent !== 0) {
         snippetNode.innerHTML = stripInitialIndent(innerHTML, minIndent);
       } else {
         snippetNode.innerHTML = innerHTML;
       }

       vscode.setState({
         innerHTML
       });
     });

     brush.addEventListener("click", () => {
       changeTool("brush")
     })

     line.addEventListener("click", () => {
       changeTool("line")
     })

     rectangle.addEventListener("click", () => {
       changeTool("rectangle")
     })

     color.addEventListener("input", () => {
       strokeColor = color.value;
       fillColor = color.value;
     })

     shootContainer(obturateurLogo)
     shootContainer(obturateur)

     /* Abstraction of click event listener */
     function shootContainer(event) {
       event.addEventListener("click", () => {
         if (target === "container") {
           shootAll();
         } else {
           shootSnippet();
         }
       });
     }
     //  redsise event listener
     const ro = new ResizeObserver(entries => {
       for (let entry of entries) {
         const cr = entry.contentRect;
         //Element size: ${cr.width}px x ${cr.height}px`);
         reactToContainerResize(cr.width, cr.height)
       }
     });

     // // Observe one or multiple elements
     ro.observe(snippetNode);

     function reactToContainerResize(width, height) {
       //  save the image
       canvasWidth = width;
       canvasHeight = height
       //  SaveCanvasImage()
       canvas.height = height;
       canvas.width = width;
       // redraw the image
       //  RedrawCanvasImage()
     }
     //
     function shootAll() {
       const width = snippetContainerNode.offsetWidth * 2;
       const height = snippetContainerNode.offsetHeight * 2;

       const config = {
         width,
         height,
         style: {
           transform: "scale(2)",
           "transform-origin": "center",

           background: getRgba(backgroundColor, transparentBackground)
         }
       };
       // Hacky adjust of the canvas postion befrore capturing in order to align correctly.
       canvas.style.transform = "translate( 240px, 140px)"
       // Hide resizer before capture
       snippetNode.style.resize = "none";
       snippetContainerNode.style.resize = "none";

       domtoimage.toBlob(snippetContainerNode, config).then(blob => {
         canvas.style.transform = "none"
         snippetNode.style.resize = "";
         snippetContainerNode.style.resize = "";
         serializeBlob(blob, serializedBlob => {
           shoot(serializedBlob);
         });
       });
     }

     function shootSnippet() {
       const width = snippetContainerNode.offsetWidth * 2;
       const height = snippetContainerNode.offsetHeight * 2;
       const config = {
         width,
         height,
         style: {
           transform: "scale(2)",
           "transform-origin": "center",
           background: "none"
         }
       };
       // Hacky adjust of the canvas postion befrore capturing in order to align correctly.
       canvas.style.transform = "translate( 240px, 140px)"

       // Hide resizer before capture
       snippetNode.style.resize = "none";
       snippetContainerNode.style.resize = "none";

       domtoimage.toBlob(snippetContainerNode, config).then(blob => {
         canvas.style.transform = "none"
         snippetNode.style.resize = "";
         snippetContainerNode.style.resize = "";
         serializeBlob(blob, serializedBlob => {
           shoot(serializedBlob);
         });
       });
     }

     let isInAnimation = false;

     obturateurLogo.addEventListener("mouseover", () => {
       if (!isInAnimation) {
         isInAnimation = true;

         new Vivus(
           "save_logo", {
             duration: 40,
             onReady: () => {
               obturateurLogo.className = "obturateur filling";
             }
           },
           () => {
             setTimeout(() => {
               isInAnimation = false;
               obturateurLogo.className = "obturateur";
             }, 700);
           }
         );
       }
     });

     window.addEventListener("message", e => {
       if (e) {
         if (e.data.type === "init") {
           const {
             fontFamily,
             bgColor
           } = e.data;

           const initialHtml = getInitialHtml(fontFamily);
           snippetNode.innerHTML = initialHtml;
           vscode.setState({
             innerHTML: initialHtml
           });

           // update backdrop color, using bgColor from last pasted snippet
           // cannot deduce from initialHtml since it's always using Nord color
           if (isDark(bgColor)) {
             snippetContainerNode.style.backgroundColor = "#f2f2f2";
           } else {
             snippetContainerNode.style.background = "none";
           }
         } else if (e.data.type === "update") {
           document.execCommand("paste");
         } else if (e.data.type === "restore") {
           snippetNode.innerHTML = e.data.innerHTML;
           updateEnvironment(e.data.bgColor);
         } else if (e.data.type === "restoreBgColor") {
           updateEnvironment(e.data.bgColor);
         } else if (e.data.type === "updateSettings") {
           snippetNode.style.boxShadow = e.data.shadow;
           target = e.data.target;
           transparentBackground = e.data.transparentBackground;
           snippetContainerNode.style.backgroundColor = e.data.backgroundColor;
           backgroundColor = e.data.backgroundColor;
           if (e.data.ligature) {
             snippetNode.style.fontVariantLigatures = "normal";
           } else {
             snippetNode.style.fontVariantLigatures = "none";
           }
         }
       }
     });

     /**
      *                   PaintJS
      * JavaScript Paint App JavaScript Canvas API
      */

     let savedImageData;
     // Stores whether I'm currently dragging the mouse
     let dragging = false;
     let strokeColor = 'red';
     let fillColor = 'red';
     let line_Width = 1;
     let polygonSides = 6;

     // Tool currently using
     let currentTool = 'brush';
     /** Changed canvas 's height and width to the innerheight of snippetnode. */
     let canvasWidth = snippetNode.clientWidth;
     let canvasHeight = snippetNode.clientHeight;

     // Stores whether I'm currently using brush
     let usingBrush = false;
     // Stores line x & ys used to make brush lines
     let brushXPoints = new Array();
     let brushYPoints = new Array();
     // Stores whether mouse is down
     let brushDownPos = new Array();

     // Stores size data used to create rubber band shapes
     // that will redraw as the user moves the mouse
     class ShapeBoundingBox {
       constructor(left, top, width, height) {
         this.left = left;
         this.top = top;
         this.width = width;
         this.height = height;
       }
     }

     // Holds x & y position where clicked
     class MouseDownPos {
       constructor(x, y) {
         this.x = x,
           this.y = y;
       }
     }

     // Holds x & y location of the mouse
     class Location {
       constructor(x, y) {
         this.x = x,
           this.y = y;
       }
     }

     // Holds x & y polygon point values
     class PolygonPoint {
       constructor(x, y) {
         this.x = x,
           this.y = y;
       }
     }
     // Stores top left x & y and size of rubber band box 
     let shapeBoundingBox = new ShapeBoundingBox(0, 0, 0, 0);

     // Holds x & y position where clicked
     let mousedown = new MouseDownPos(0, 0);

     // Holds x & y location of the mouse
     let loc = new Location(0, 0);
     ctx.strokeStyle = strokeColor;
     ctx.lineWidth = line_Width;

     // Execute ReactToMouseDown when the mouse is clicked
     canvas.addEventListener("mousedown", ReactToMouseDown);
     // Execute ReactToMouseMove when the mouse is clicked
     canvas.addEventListener("mousemove", ReactToMouseMove);
     // Execute ReactToMouseUp when the mouse is clicked
     canvas.addEventListener("mouseup", ReactToMouseUp);
     //  }

     function changeTool(toolClicked) {
       document.getElementById("brush").className = "";
       document.getElementById("line").className = "";
       document.getElementById("rectangle").className = "";
       // Highlight the last selected tool on toolbar
       document.getElementById(toolClicked).className = "selected";
       // Change current tool used for drawing
       currentTool = toolClicked;
     }

     // Returns mouse x & y position based on canvas position in page
     function GetMousePosition(x, y) {
       // Get canvas size and position in web page
       let canvasSizeData = canvas.getBoundingClientRect();
       return {
         x: (x - canvasSizeData.left) * (canvas.width / canvasSizeData.width),
         y: (y - canvasSizeData.top) * (canvas.height / canvasSizeData.height)
       };
     }

     function SaveCanvasImage() {
       // Save image
       savedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
     }

     function RedrawCanvasImage() {
       // Restore image
       ctx.putImageData(savedImageData, 0, 0);
     }

     function UpdateRubberbandSizeData(loc) {
       // Height & width are the difference between were clicked
       // and current mouse position
       shapeBoundingBox.width = Math.abs(loc.x - mousedown.x);
       shapeBoundingBox.height = Math.abs(loc.y - mousedown.y);

       // If mouse is below where mouse was clicked originally
       if (loc.x > mousedown.x) {

         // Store mousedown because it is farthest left
         shapeBoundingBox.left = mousedown.x;
       } else {

         // Store mouse location because it is most left
         shapeBoundingBox.left = loc.x;
       }

       // If mouse location is below where clicked originally
       if (loc.y > mousedown.y) {

         // Store mousedown because it is closer to the top
         // of the canvas
         shapeBoundingBox.top = mousedown.y;
       } else {

         // Otherwise store mouse position
         shapeBoundingBox.top = loc.y;
       }
     }

     // Returns the angle using x and y
     // x = Adjacent Side
     // y = Opposite Side
     // Tan(Angle) = Opposite / Adjacent
     // Angle = ArcTan(Opposite / Adjacent)
     function getAngleUsingXAndY(mouselocX, mouselocY) {
       let adjacent = mousedown.x - mouselocX;
       let opposite = mousedown.y - mouselocY;

       return radiansToDegrees(Math.atan2(opposite, adjacent));
     }

     function radiansToDegrees(rad) {
       if (rad < 0) {
         // Correct the bottom error by adding the negative
         // angle to 360 to get the correct result around
         // the whole circle
         return (360.0 + (rad * (180 / Math.PI))).toFixed(2);
       } else {
         return (rad * (180 / Math.PI)).toFixed(2);
       }
     }

     // Converts degrees to radians
     function degreesToRadians(degrees) {
       return degrees * (Math.PI / 180);
     }

     //  function getPolygonPoints() {
     //    // Get angle in radians based on x & y of mouse location
     //    let angle = degreesToRadians(getAngleUsingXAndY(loc.x, loc.y));

     //    // X & Y for the X & Y point representing the radius is equal to
     //    // the X & Y of the bounding rubberband box
     //    let radiusX = shapeBoundingBox.width;
     //    let radiusY = shapeBoundingBox.height;
     //    // Stores all points in the polygon
     //    let polygonPoints = [];

     //    // Each point in the polygon is found by breaking the 
     //    // parts of the polygon into triangles
     //    // Then I can use the known angle and adjacent side length
     //    // to find the X = mouseLoc.x + radiusX * Sin(angle)
     //    // You find the Y = mouseLoc.y + radiusY * Cos(angle)
     //    for (let i = 0; i < polygonSides; i++) {
     //      polygonPoints.push(new PolygonPoint(loc.x + radiusX * Math.sin(angle),
     //        loc.y - radiusY * Math.cos(angle)));

     //      // 2 * PI equals 360 degrees
     //      // Divide 360 into parts based on how many polygon 
     //      // sides you want 
     //      angle += 2 * Math.PI / polygonSides;
     //    }
     //    return polygonPoints;
     //  }

     // Get the polygon points and draw the polygon
     //  function getPolygon() {
     //    let polygonPoints = getPolygonPoints();
     //    ctx.beginPath();
     //    ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
     //    for (let i = 1; i < polygonSides; i++) {
     //      ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
     //    }
     //    ctx.closePath();
     //  }

     // Called to draw the line
     function drawRubberbandShape(loc) {
       ctx.strokeStyle = strokeColor;
       ctx.fillStyle = fillColor;
       if (currentTool === "brush") {
         // Create paint brush
         DrawBrush();
       } else if (currentTool === "line") {
         // Draw Line
         ctx.beginPath();
         ctx.moveTo(mousedown.x, mousedown.y);
         ctx.lineTo(loc.x, loc.y);
         ctx.stroke();
       } else if (currentTool === "rectangle") {
         // Creates rectangles
         ctx.strokeRect(shapeBoundingBox.left, shapeBoundingBox.top, shapeBoundingBox.width, shapeBoundingBox.height);
       }

     }

     function UpdateRubberbandOnMove(loc) {
       // Stores changing height, width, x & y position of most 
       // top left point being either the click or mouse location
       UpdateRubberbandSizeData(loc);

       // Redraw the shape
       drawRubberbandShape(loc);
     }

     // Store each point as the mouse moves and whether the mouse
     // button is currently being dragged
     function AddBrushPoint(x, y, mouseDown) {
       brushXPoints.push(x);
       brushYPoints.push(y);
       // Store true that mouse is down
       brushDownPos.push(mouseDown);
     }

     // Cycle through all brush points and connect them with lines
     function DrawBrush() {
       for (let i = 1; i < brushXPoints.length; i++) {
         ctx.beginPath();

         // Check if the mouse button was down at this point
         // and if so continue drawing
         if (brushDownPos[i]) {
           ctx.moveTo(brushXPoints[i - 1], brushYPoints[i - 1]);
         } else {
           ctx.moveTo(brushXPoints[i] - 1, brushYPoints[i]);
         }
         ctx.lineTo(brushXPoints[i], brushYPoints[i]);
         ctx.closePath();
         ctx.stroke();
       }
     }

     function ReactToMouseDown(e) {
       // Change the mouse pointer to a crosshair
       canvas.style.cursor = "crosshair";
       // Store location 
       loc = GetMousePosition(e.clientX, e.clientY);
       // Save the current canvas image
       SaveCanvasImage();
       // Store mouse position when clicked
       mousedown.x = loc.x;
       mousedown.y = loc.y;
       // Store that yes the mouse is being held down
       dragging = true;

       // Brush will store points in an array
       if (currentTool === 'brush') {
         usingBrush = true;
         AddBrushPoint(loc.x, loc.y);
       }
     };

     function ReactToMouseMove(e) {
       canvas.style.cursor = "crosshair";
       loc = GetMousePosition(e.clientX, e.clientY);

       // If using brush tool and dragging store each point
       if (currentTool === 'brush' && dragging && usingBrush) {
         // Throw away brush drawings that occur outside of the canvas
         if (loc.x > 0 && loc.x < canvasWidth && loc.y > 0 && loc.y < canvasHeight) {
           AddBrushPoint(loc.x, loc.y, true);
         }
         RedrawCanvasImage();
         DrawBrush();
       } else {
         if (dragging) {
           RedrawCanvasImage();
           UpdateRubberbandOnMove(loc);
         }
       }
     };

     function ReactToMouseUp(e) {
       canvas.style.cursor = "default";
       loc = GetMousePosition(e.clientX, e.clientY);
       RedrawCanvasImage();
       UpdateRubberbandOnMove(loc);
       dragging = false;
       usingBrush = false;
     }

     // Saves the image in your default download directory
     function SaveImage() {
       // Get a reference to the link element 
       var imageFile = document.getElementById("img-file");
       // Set that you want to download the image when link is clicked
       imageFile.setAttribute('download', 'image.png');
       // Reference the image in canvas for download
       imageFile.setAttribute('href', canvas.toDataURL());
     }

     function OpenImage() {
       let img = new Image();
       // Once the image is loaded clear the canvas and draw it
       img.onload = function () {
         ctx.clearRect(0, 0, canvas.width, canvas.height);
         ctx.drawImage(img, 0, 0);
       }
       img.src = 'image.png';
     }

     function getRgba(hex, transparentBackground) {
       const bigint = parseInt(hex.slice(1), 16);
       const r = (bigint >> 16) & 255;
       const g = (bigint >> 8) & 255;
       const b = bigint & 255;
       const a = transparentBackground ? 0 : 1;
       return `rgba(${r}, ${g}, ${b}, ${a})`;
     }
   })();


 }