import { Component, OnInit } from '@angular/core';
import {ApiService} from '../shared/api.service';
declare var d3: any;
@Component({
  selector: 'app-tree-component',
  templateUrl: './tree-component.component.html',
  styleUrls: ['./tree-component.component.scss']
})
export class TreeComponentComponent implements OnInit {

  name = 'D3!';
  public margin = {
    top: 20,
    right: 120,
    bottom: 20,
    left: 120
  };

  width = 1400 - this.margin.right - this.margin.left;
  height = 800 - this.margin.top - this.margin.bottom;
  private _nodeDataService: any

  public inst: number = 1;
  public duration: number = 750;
  public rectW: number = 60;
  public rectH: number = 30;
  public zm: any;
  public collapse: Function;
  public d: any;
  public error: any;
  public view: any;
  public parent: any;
  public visitFn: any;
  public childrenFn: any;
  public links: any;
  public tree: any;
  public maxLabelLength: any;
  public svg: any;
  public drag: any;
  public dragmove: any;
  public BRANCH_SPACE = 80;

  constructor(public api:ApiService) {
    this.api.getJSON().subscribe(data => {
      this._nodeDataService = {
        root:data
      }
      this.getNodes();
     });
   }

  ngOnInit() {
    this.tree = d3.layout.tree().size([this.height, this.width]);
    this.drag = d3.behavior.drag()
      .on("drag", this.dragmove);

    this.dragmove = (d) => {
      var x = d3.event.x;
      var y = d3.event.y;
      d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
    };

    this.svg = d3.select("#body").append("svg")
      .attr("width", this.width + this.margin.right + this.margin.left)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .call(this.drag)
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  }

  diagonal = d3.svg.diagonal().projection((d: any) => {
    return [d.y, d.x];
  });

  // A recursive helper function for performing some setup by walking through all nodes
  public visit = (parent: any, visitFn: any, childrenFn: any): void => {
    if (typeof childrenFn !== 'function') {
      childrenFn = function (node) {
        return node.children || null;
      };
    }

    if (!parent) {
      return;
    }

    visitFn(parent);
    var children = childrenFn(parent);
    if (children) {
      for (var i = 0, count = children.length; i < count; i++) {
        this.visit(children[i], visitFn, childrenFn);
      }
    }
  }

  ngAfterViewInit() { }

  toggle(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
  }

  getNodes() {
    this._nodeDataService.root.x0 = 0;
    this._nodeDataService.root.y0 = this.height / 2;

    this.collapse = (d: any) => {
      if (d.children) {
        d._children = d.children;
        d._children.forEach(this.collapse);
        d.children = null;
      }
    };

    this._nodeDataService.root.children.forEach(this.collapse);
    this._nodeDataService.root.children.forEach((element, index) => {
      let e_data = element._children
      if (element._children) {
        this.toggle(this._nodeDataService.root.children[index])
        e_data.forEach((data, i) => {
          this.toggle(this._nodeDataService.root.children[index].children[i])
          let c_data = data.children
          if (c_data && c_data.length) {
            c_data.forEach((c_data, j) => {
              this.toggle(this._nodeDataService.root.children[index].children[i].children[j])
            })
          }
        })
      }
    })

    this.update(this._nodeDataService.root, true);
    // Call visit function to establish maxLabelLength
    this.visit(this._nodeDataService.root, (d: any) => {
      let totalNodes: number = 0;
      totalNodes++;
      this.maxLabelLength = Math.max(d.name.length, this.maxLabelLength);
    }, (d: any) => {
      return d.children && d.children.length > 0 ? d.children : null;
    });
  }

  //necessary so that zoom knows where to zoom and unzoom from
  selectFrame = d3.select(self.frameElement).style("height", "800px");
  public i = 0;

  update = (source: any, selected) => {
    var duration = d3.event && d3.event.altKey ? 5000 : 500;
    let i: number = 0;
    let _this = this;
    // Compute the new tree layout.
    let nodes = this.tree.nodes(this._nodeDataService.root).reverse(),
      links = this.tree.links(nodes);
    // Normalize for fixed-depth.
    nodes.forEach((n: any) => {
      n.y = n.depth * 270;
    });

    // Update the nodes…
    let node = this.svg.selectAll("g.node")
      .data(nodes, function (n: any) {
        return n.id || (n.id = ++i);
      });

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("svg:g")
      .attr("class", "node")
      .attr("transform", function (d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", function (d) {
        d3.selectAll("line").remove()
        _this.update(d, true);
      });

    nodeEnter.append("svg:circle")
      .attr("r", 1e-6)
      .attr("id", function (d) { return 'circle' + d.id })
      .style("fill", function (d) { return d._children ? "lightsteelblue" : "#fff"; })
      .on("click", this.clickedEvt);

    nodeEnter.append("svg:image")
      .attr("xlink:href",  function(d) {
          if (d.flag)
            return "../../assets/green_flag.png"
      })
      .attr("x", - 20 )
      .attr("y", -25 )
      .attr("height", 50)
      .attr("width", 50)
      .on("click", this.clickedEvt);

    nodeEnter.append("svg:rect")
      .attr('style', 'fill: #c8f26d;')
      .attr('stroke', '#f49f16')
      .attr('rx', 5)
      .attr('ry', 5)
      .style("stroke-width", "2.5px");

    nodeEnter.append("svg:text")
      .attr("dy", ".35em")
      .attr("id", function (d) { return 'text' + d.id; })
      .style("text-anchor", "start")
      .style("dominant-baseline", "alphabetic")
      .text(function (d) { return d.name; })
      .style("fill-opacity", 1e-6)

    let self = this;
    nodeEnter.selectAll('text')
      .attr('x', function (d) { 
        var circleWidth = self.getBox('circle' + d.id).getBBox().width;
        return circleWidth + 30;
      })
      .attr('y', function (d) { return self.getBox('circle' + d.id).getBBox().height; });

    nodeEnter.selectAll('rect')
      .attr('width', function (d) {
        var isText = document.getElementById('text' + d.id).textContent;
        return (isText) ? self.getBox('text' + d.id).getBBox().width + 5 : 0;
      })
      .attr('height', function (d) { return self.getBox('text' + d.id).getBBox().height + 5; })
      .attr('x', function (d) { return self.getBox('text' + d.id).getBBox().x; })
      .attr('y', function (d) { return self.getBox('text' + d.id).getBBox().y; });

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function (d) { return "translate(" + d.y + "," + d.x + ")"; });

    nodeUpdate.select("circle")
      .attr("r", (d) => {
        if (selected) {
          if (d.name == source.name) {
            if (d.visited) {
              return 26
            }
            return 40
          }
        }
        return 26
      })
      .style("fill", (d) => {
        if (selected) {
          if (d.name == source.name) {
            return "purple"
          }
        }
        return d._children ? "#0000FF" : "#B0C4DE";
      })
      .style("stroke", (d) => {
        return "#0000FF"
      })
      .style("stroke-width", (d) => {
        return 3
      });

    nodeUpdate.select("text")
      .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function (d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

    nodeExit.select("circle")
      .attr("r", 1e-6);

    nodeExit.select("text")
      .style("fill-opacity", 1e-6);

    // Update the links…
    var link = this.svg.selectAll("path.link")
      .data(this.tree.links(nodes), function (d) { return d.target.id; });

    link.enter().insert("svg:line", "g")
      .attr("class", "link")
      .attr("x1", function (d) {
        return d.source.y;
      })
      .attr("y1", function (d) {
        return d.source.x;
      })
      .attr("x2", function (d) {
        return d.target.y;
      })
      .attr("y2", function (d) {
        return d.target.x;
      })
      .style("fill", "none")
      .style("stroke", "#80B8FF")
      .style("stroke-width", 1.5)

    link.transition()
      .duration(duration)
      .attr("x1", function (d) {
        return d.source.y;
      })
      .attr("y1", function (d) {
        return d.source.x;
      })
      .attr("x2", function (d) {
        return d.target.y;
      })
      .attr("y2", function (d) {
        return d.target.x;
      });

    link.exit().transition()
      .duration(duration)
      .attr("x1", function (d) {
        return d.source.y;
      })
      .attr("y1", function (d) {
        return d.source.x;
      })
      .attr("x2", function (d) {
        return d.target.y;
      })
      .attr("y2", function (d) {
        return d.target.x;
      })
      .remove();

    // Stash the old positions for transition.
    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  };

  getBox(d): any {
    return document.getElementById(d)
  }

  clickedEvt = (d): void => {
    this.toggle(d);
    console.log('clickedEvt', d);
  }
}