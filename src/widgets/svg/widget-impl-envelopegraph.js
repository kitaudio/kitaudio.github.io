import Widget from "./widget";
import Constraint from "./constraint";
import ConstraintSpec from "./constraint-spec";
import MathUtil from "./util-math";

/**
 * Class representing an Envelope Graph widget
 *
 * @class
 * @implements {Widget}
 */
class WidgetEnvelopeGraph extends Widget {

  /**
   * @constructor
   * @param {object} container - DOM container for the widget.
   * @param {object=} o - Options.
   * @param {number=0} o.minXVal - Minimum X value.
   * @param {number=0} o.minYVal - Minimum Y value.
   * @param {number=100} o.maxXVal - Maximum X value.
   * @param {number=100} o.maxYVal - Maximum Y value.
   * @param {number=-1} o.maxNumVertices - Maximum number of vertices.
   * @param {number=0.1} o.quantizeX - X-quantization ("grid") value.
   * @param {number=0.1} o.quantizeY - Y-quantization ("grid") value.
   * @param {number=1} o.xDecimalPrecision - Number of decimal places for output of the X values.
   * @param {number=1} o.yDecimalPrecision - Number of decimal places for output of the Y values.
   * @param {boolean=false} o.hasFixedStartPoint - Is there a fixed start vertex?
   * @param {boolean=false} o.hasFixedEndPoint - Is there a fixed end vertex?
   * @param {number=0} o.fixedStartPointY - Y value of the fixed start vertex, if exists.
   * @param {number=0} o.fixedEndPointY - Y value of the fixed end vertex, if exists.
   * @param {boolean=true} o.isEditable - Is the graph editable?
   * @param {string="#000"} o.vertexColor - Color of vertex points.
   * @param {string="#000"} o.lineColor - Color of lines connecting the vertices.
   * @param {string="#fff"} o.bgColor - Background color.
   * @param {number=2} o.lineWidth - Width of the connecting lines.
   * @param {number=4} o.vertexRadius - Radius of the vertex points.
   * @param {number=1.2} o.mouseSensitivity - Mouse sensitivity (how much moving the mouse affects the interaction).
   */
  constructor(container, o) {
    super(container, o);
  }

  /**
   * Initialize the options
   * @override
   * @protected
   */
  _initOptions(o) {
    // set defaults
    this.o = {
      minXVal: 0,
      minYVal: 0,
      maxXVal: 100,
      maxYVal: 100,
      maxNumVertices: -1,
      quantizeX: 0.1,
      quantizeY: 0.1,
      xDecimalPrecision: 1,
      yDecimalPrecision: 1,
      hasFixedStartPoint: false,
      hasFixedEndPoint: false,
      fixedStartPointY: 0,
      fixedEndPointY: 0,
      isEditable: true,
      vertexColor: "#f40",
      lineColor: "#484848",
      bgColor: "#fff",
      vertexRadius: 4,
      lineWidth: 2,
      mouseSensitivity: 1.2
    };

    // override defaults with provided options
    this.setOptions(o);
  }

  /**
   * Initialize state constraints
   * @override
   * @protected
   */
  _initStateConstraints() {
    const _this = this;

    this.stateConstraints = new ConstraintSpec({
      vertices: [{
        x: new Constraint({
          min: _this.o.minXVal,
          max: _this.o.maxXVal,
          transform: (num) => {
            return MathUtil.quantize(num, _this.o.quantizeX)
              .toFixed(_this.o.xDecimalPrecision);
          }
        }),
        y: new Constraint({
          min: _this.o.minYVal,
          max: _this.o.maxYVal,
          transform: (num) => {
            return MathUtil.quantize(num, _this.o.quantizeY)
              .toFixed(_this.o.yDecimalPrecision);
          }
        })
      }]
    });
  }

  /**
   * Initialize state
   * @override
   * @protected
   */
  _initState() {
    this.state = {
      // verices contains an array of vertices
      // each vertex is an object of form {x, y}
      vertices: []
    };
  }

  /**
   * Initialize the svg elements
   * @override
   * @protected
   */
  _initSvgEls() {
    const _this = this;

    this.svgEls = {
      panel: document.createElementNS(this.SVG_NS, "rect"),
      vertices: [],
      lines: []
    };

    this.svgEls.panel.setAttribute("width", this._getWidth());
    this.svgEls.panel.setAttribute("height", this._getHeight());
    this.svgEls.panel.setAttribute("fill", this.o.bgColor);
    this.svgEls.panel.setAttribute("stroke", this.o.lineColor);

    this._appendSvgEls();
    this._update();
  }

  /**
   * Initialize mouse and touch event handlers
   * @override
   * @protected
   */
  _initHandlers() {
    const _this = this;

    let targetVtx = null;
    let targetLine = null;
    let x0 = 0;
    let y0 = 0;
    let dx = 0;
    let dy = 0;

    this.handlers = {

       touchPanel: function touchPanel(ev) {
         let xPos = ev.clientX - _this._getLeft();
         let yPos = ev.clientY - _this._getTop()
         let vertexState = _this._calcVertexState({x: xPos, y: yPos});

         _this.addVertex(vertexState);
       },

       touchVertex: function touchVertex(ev) {
         targetVtx = ev.target;

         document.addEventListener("mousemove", _this.handlers.moveVertex);
         document.addEventListener("touchmove", _this.handlers.moveVertex);
         ev.target.addEventListener("mouseup", _this.handlers.deleteVertex);
         ev.target.addEventListener("touchend", _this.handlers.deleteVertex);
       },

       touchLine: function touchLine(ev) {
         targetLine = ev.target;

         x0 = ev.clientX - _this._getLeft();
         y0 = ev.clientY - _this._getTop();

         document.addEventListener("mousemove", _this.handlers.moveLine);
         document.addEventListener("touchmove", _this.handlers.moveLine);
       },

       moveLine: function moveLine(ev) {
         document.addEventListener("mouseup", _this.handlers.endMoveLine);
         document.addEventListener("touchend", _this.handlers.endMoveLine);

         let x1 = ev.clientX - _this._getLeft();
         let y1 = ev.clientY - _this._getTop();

         dx = x1 - x0;
         dy = y1 - y0;

         console.log("x0", x0, "y0", y0, "x1", x1, "y1", y1, "dx", dx, "dy", dy);

         _this._moveLine(targetLine, {x: dx, y: dy});

         x0 = x1;
         y0 = y1;
       },

       endMoveLine: function endMoveLine(ev) {
         document.removeEventListener("mousemove", _this.handlers.moveLine);
         document.removeEventListener("touchmove", _this.handlers.moveLine);
       },

       deleteVertex: function deleteVertex(ev) {
         document.removeEventListener("mousemove", _this.handlers.moveVertex);
         document.removeEventListener("touchmove", _this.handlers.moveVertex);

         _this._deleteVertex(ev.target);

         ev.target.removeEventListener("mouseup", _this.handlers.deleteVertex);
         ev.target.removeEventListener("touchend", _this.handlers.deleteVertex);
       },

       moveVertex: function moveVertex(ev) {
         targetVtx.removeEventListener("mouseup", _this.handlers.deleteVertex);
         targetVtx.removeEventListener("touchend", _this.handlers.deleteVertex);

         document.addEventListener("mouseup", _this.handlers.endMoveVertex);
         document.addEventListener("touchend", _this.handlers.endMoveVertex);

         let xPos = ev.clientX - _this._getLeft();
         let yPos = ev.clientY - _this._getTop();

         _this._moveVertex(targetVtx, {x: xPos, y: yPos});
       },

       endMoveVertex: function endMoveVertex(ev) {
         document.removeEventListener("mousemove", _this.handlers.moveVertex);
         document.removeEventListener("touchmove", _this.handlers.moveVertex);
       }
    };

    this.svgEls.panel.addEventListener("mousedown", _this.handlers.touchPanel);
    this.svgEls.panel.addEventListener("touchdown", _this.handlers.touchPanel);

    this.svgEls.vertices.forEach(vtx => {
      vtx.addEventListener("mousedown", _this.handlers.touchVertex);
      vtx.addEventListener("touchdown", _this.handlers.touchVertex);
    });

    this.svgEls.lines.forEach(line => {
      line.addEventListener("mousedown", _this.handlers.touchLine);
      line.addEventListener("touchdown", _this.handlers.touchLine);
    });
  }

  /**
   * Finalize the state before _update().
   * Sort the vertices and make sure correct values are used if o.hasFixedStartPoint or
   * o.hasFixedEndPoint flags are used.
   */
   //TODO: is this method really needed? Can do the work of this method inside _update();
  _finalizeState() {
  }

  /**
   * Update (redraw) component based on state
   * @override
   * @protected
   */
  _update() {
      const _this = this;

      // if there are more state vertices than svg vertices, add a corresponding number of svg vertices and lines
      for (let i = _this.svgEls.vertices.length; i < _this.state.vertices.length; ++i) {
        _this._addSvgVertex();
      }

      // if there are more svg vertices than state vertices, remove a corresponding number of svg vertices and lines
      for (let i = _this.svgEls.vertices.length; i > _this.state.vertices.length; --i) {
        _this._removeSvgVertex();
      }

      // sort svg vertexes
      let idxSortMap = _this.state.vertices.map((vtx, idx) => { return { vtx: vtx, idx: idx }});
      idxSortMap.sort((a, b) => a.vtx.x - b.vtx.x);
      _this.state.vertices = idxSortMap.map(el => _this.state.vertices[el.idx]);
      _this.svgEls.vertices = idxSortMap.map(el => _this.svgEls.vertices[el.idx]);

      // set the correct position coordinates for every vertex
      _this.state.vertices.forEach((stateVtx, idx) => {
        let svgVtx = _this.svgEls.vertices[idx];
        let pos = _this._calcVertexPos(stateVtx);

        svgVtx.setAttribute("cx", pos.x);
        svgVtx.setAttribute("cy", pos.y);
        svgVtx.setAttribute("r", _this.o.vertexRadius);
        svgVtx.setAttribute("fill", _this.o.vertexColor);

        // for every vertex other than the first, draw a line to the previous vertex
        if (idx > 0) {
          let prevVtx = _this.state.vertices[idx - 1];
          let prevPos = _this._calcVertexPos(prevVtx);
          let line = _this.svgEls.lines[idx - 1];

          line.setAttribute("d", "M " + pos.x + " " + pos.y + " L " + prevPos.x + " " + prevPos.y);
          line.setAttribute("fill", "transparent");
          line.setAttribute("stroke-width", _this.o.lineWidth);
          line.setAttribute("stroke", _this.o.lineColor)
        }
      });

      // remove and reappend all svg elements so that vertices are on top of lines
      _this.svgEls.lines.forEach(svgLine => {
        _this.svg.removeChild(svgLine);
        _this.svg.appendChild(svgLine);
      });

      _this.svgEls.vertices.forEach(svgVtx => {
        _this.svg.removeChild(svgVtx);
        _this.svg.appendChild(svgVtx);
      });

      // reassign listeners
      _this.svgEls.vertices.forEach(vtx => {
        vtx.addEventListener("mousedown", _this.handlers.touchVertex);
        vtx.addEventListener("touchdown", _this.handlers.touchVertex);
      });

      _this.svgEls.lines.forEach(line => {
        line.addEventListener("mousedown", _this.handlers.touchLine);
        line.addEventListener("touchdown", _this.handlers.touchLine);
      });
   }

   /**
    * Set the state as an array of [x, y] vertex pairs.
    * @param {array} - An array of [x, y] points
    */
   setVal(vertexArray) {
     let vertices = vertexArray.map(xyPair => { return {x: xyPair[0], y: xyPair[1]} });

     this.setState({ vertices: vertices });
   }

   /**
    * Set the state as an array of [x, y] vertex pairs.
    * Same as setVal, but will cause an observer callback trigger.
    * @param {array} - An array of [x, y] points
    */
    _setVal(vertexArray) {
      let vertices = vertexArray.map(xyPair => { return {x: xyPair[0], y: xyPair[1]} });

      this._setState({ vertices: vertices });
    }

   /**
    * Return the state.
    * @override
    */
   getPublicState() {
     return this.state.vertices.map(vtx => [vtx.x, vtx.y]);
   }

  /* ==============
   * Helper Methods
   * ==============
   */

   /** convert on-screen x distance to scaled x state-value */
   _xPxToVal(x) {
     return (x / this._getWidth()) * (this.o.maxXVal - this.o.minXVal);
   }

   /** convert on-screen y distance to scaled y state-value */
   _yPxToVal(y) {
     return (y / this._getHeight()) * (this.o.maxYVal - this.o.minYVal);
   }

   /** Calculate the x and y for a vertex in the graph according to its state value */
   _calcVertexPos(vertexState) {
     return {
       x: this._getWidth() * (vertexState.x / this.o.maxXVal),
       y: this._getHeight() - (this._getHeight() * (vertexState.y / this.o.maxYVal))
     }
   }

   /** Calculate the x and y for a vertex state based on position on the graph
    *  (inverse of _calcVertexPos)
    */
  _calcVertexState(vertexPos) {
    return {
      x: this.o.maxXVal * (vertexPos.x / this._getWidth()),
      y: this.o.maxYVal - (this.o.maxYVal * (vertexPos.y / this._getHeight()))
    }
  }

   /**
    * Add a new vertex to the state
    * @public
    * @param {object} pos
    * @param {number} pos.x
    * @param {number} pos.y
    */
   addVertex(pos) {
     let newVertices = this.getState().vertices.map(x=>x);

     newVertices.push({x: pos.x, y: pos.y});
     newVertices.sort((a, b) => a.x - b.x);

     this._setState({
       vertices: newVertices
     });
   }

   /**
    * Delete a vertex
    * @private
    * @param {SVGElement} targetVtx - Vertex to Delete
    */
   _deleteVertex(targetVtx) {
     const _this = this;
     let vtxIdx = this.svgEls.vertices.findIndex(vtx => vtx === targetVtx);

     if (vtxIdx !== -1) {
       let newVertices = this.getState().vertices.map(x=>x);
       newVertices.splice(vtxIdx, 1);
       _this._setState({
         vertices: newVertices
       });
     }
   }

   /** Move a line
    *  @private
    * @param {SVGElement} targetLine - The target line
    * @param {Object} dPos - Delta position
    * @param {number} dPos.x
    * @param {number} dPos.y
    */
   _moveLine(targetLine, dPos) {
     const _this = this;

     let lineIdx = _this.svgEls.lines.findIndex(line => line === targetLine);
     let vtxL = _this.svgEls.vertices[lineIdx];
     let vtxR = _this.svgEls.vertices[lineIdx + 1];

     let vtxLnewPos = {
       x: _this.svgEls.vertices[lineIdx].getAttribute("cx") + dPos.x,
       y: _this.svgEls.vertices[lineIdx].getAttribute("cy") + dPos.y
     };

     let vtxRnewPos = {
       x: _this.svgEls.vertices[lineIdx + 1].getAttribute("cx") + dPos.x,
       y: _this.svgEls.vertices[lineIdx + 1].getAttribute("cy") + dPos.y
     };

     this._moveVertex(vtxL, vtxLnewPos);
     this._moveVertex(vtxR, vtxRnewPos);
   }

   /**
    * Move a vertex
    * @private
    * @param {SVGElement} targetVtx - The target vertex
    * @param {Object} newPos - The new position
    * @param {number} newPos.x
    * @param {number} newPos.y
    */
   _moveVertex(targetVtx, newPos) {
     const _this = this;

     let vtxState = _this._calcVertexState(newPos);
     let vtxIdx = _this.svgEls.vertices.findIndex(vtx => vtx === targetVtx);
     let vertices = _this.getState().vertices.map(x=>x);

     vertices[vtxIdx].x = vtxState.x;
     vertices[vtxIdx].y = vtxState.y;

     _this._setState({
       vertices: vertices
     });
   }

   /** Add a new SVG vertex representation */
   _addSvgVertex() {
     const _this = this;

     // if there is more than 1 vertex, we also need to draw lines between them
     if (_this.getState().vertices.length > 1) {
       let newLine = document.createElementNS(_this.SVG_NS, "path");
        _this.svg.appendChild(newLine);
        _this.svgEls.lines.push(newLine);
     }

     let newVertex = document.createElementNS(_this.SVG_NS, "circle");
     _this.svgEls.vertices.push(newVertex);
     _this.svg.appendChild(newVertex);
   }

   /** Remove an SVG vertex */
   _removeSvgVertex() {
     let vertex = this.svgEls.vertices[this.svgEls.vertices.length - 1];
     this.svg.removeChild(vertex);
     vertex = null;
     this.svgEls.vertices.pop();

     if (this.svgEls.lines.length > 0) {
       let line = this.svgEls.lines[this.svgEls.lines.length - 1];
       this.svg.removeChild(line);
       line = null;
       this.svgEls.lines.pop();
     }
   }
}

export default WidgetEnvelopeGraph
