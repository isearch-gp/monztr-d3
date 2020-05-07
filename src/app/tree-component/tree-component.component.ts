import { Component, OnInit } from '@angular/core';
import { ApiService } from '../shared/api.service';
declare let d3: any;

@Component({
  selector: 'app-tree-component',
  templateUrl: './tree-component.component.html',
  styleUrls: ['./tree-component.component.scss']
})

export class TreeComponentComponent implements OnInit {
  treeData: any
  margin = { top: 20, right: 120, bottom: 20, left: 120 };
  width = 1400 - this.margin.left - this.margin.right;
  height = 800 - this.margin.top - this.margin.bottom;
  svg: any;
  root: any;
  treemap = d3.tree().size([this.height, this.width]);
  duration = 750;
  i = 0;

  constructor(public api: ApiService) { }

  ngOnInit() {
    this.svg = d3.select("#body").append("svg")
      .attr("width", this.width + this.margin.right + this.margin.left)
      .attr("height", this.height + this.margin.top + this.margin.bottom)
      .append("g")
      .attr("transform", "translate("
        + this.margin.left + "," + this.margin.top + ")");

    this.api.getJSON().subscribe(data => {
      this.treeData = data;
      this.root = d3.hierarchy(this.treeData, function (d) { return d.children; });
      this.root.x0 = this.height / 2;
      this.root.y0 = 0;
      this.root.children.forEach(function collapse(d) {
        if (d.children) {
          d._children = d.children
          d._children.forEach(collapse)
          d.children = null
        }
      });
      this.update(this.root, true);
    });
  }
  
  update(source: any, selected: boolean) {
    let self = this;
    let treeData = self.treemap(self.root);
    let nodes = treeData.descendants();
    let links = treeData.descendants().slice(1);   

    nodes.forEach(function (d) { d.y = d.depth * 270 });

    let node = self.svg.selectAll('g.node')
      .data(nodes, function (d) { return d.id || (d.id = ++self.i); });

    let nodeEnter = node.enter().append('svg:g')
      .attr('class', 'node')
      .attr("transform", function (d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", function (d) {
        d3.selectAll("line").remove()
        self.update(d, true);
      });

    nodeEnter.append('svg:circle')
      .attr("r", 1e-6)
      .attr("id", function (d) { return 'circle' + d.id })
      .attr("style", "stroke: #0000FF; stroke-width: 3; cursor: pointer")
      .on('click', function(d){ self.toggle(d); });

    nodeEnter.append("svg:image")
      .attr("xlink:href", function (d) { return d.data.flag ? "assets/green_flag.png" : null; })
      .attr("x", - 20)
      .attr("y", -25)
      .attr("height", 50)
      .attr("width", 50)
      .style("cursor", "pointer")
      .on('click', function(d){ self.toggle(d); });

    nodeEnter.append("svg:rect")
      .attr('style', 'fill: #c8f26d;')
      .attr('stroke', '#f49f16')
      .attr('rx', 5)
      .attr('ry', 5)
      .style("stroke-width", "2.5px");

    nodeEnter.append('svg:text')
      .attr("dy", ".35em")
      .attr("id", function (d) { return 'text' + d.id; })
      .style("text-anchor", "start")
      .style("dominant-baseline", "alphabetic")
      .text(function (d) { return d.data.name; })
      .style("fill-opacity", 1e-6);

    nodeEnter.selectAll('text')
      .attr('x', function (d) {
        let circleWidth = self.getBox('circle' + d.id).getBBox().width;
        return circleWidth + 30;
      })
      .attr('y', function (d) { return self.getBox('circle' + d.id).getBBox().height; });

    nodeEnter.selectAll('rect')
      .attr('width', function (d) {
        let isText = document.getElementById('text' + d.id).textContent;
        return (isText) ? self.getBox('text' + d.id).getBBox().width + 5 : 0;
      })
      .attr('height', function (d) { return self.getBox('text' + d.id).getBBox().height + 5; })
      .attr('x', function (d) { return self.getBox('text' + d.id).getBBox().x; })
      .attr('y', function (d) { return self.getBox('text' + d.id).getBBox().y; });

    let nodeUpdate = nodeEnter.merge(node);

    nodeUpdate.transition()
      .duration(self.duration)
      .attr("transform", function (d) {
        return "translate(" + d.y + "," + d.x + ")";
      });

    nodeUpdate.select('circle')
      .attr("r", (d) => {
        if (selected) {
          if (d.data.name == source.data.name) {
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
          if (d.data.name == source.data.name) {
            return "purple"
          }
        }
        return d._children ? "#0000FF" : "#B0C4DE";
      })

    nodeUpdate.select("text")
      .style("fill-opacity", 1);

    let nodeExit = node.exit().transition()
      .duration(self.duration)
      .attr("transform", function (d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select('circle')
      .attr('r', 1e-6);

    nodeExit.select('text')
      .style('fill-opacity', 1e-6);


    let link = self.svg.selectAll('path.link')
      .data(links, function (d) { return d.id; });

    link.enter().insert('line', "g")
      .attr("class", "link")
      .attr("x1", function (d) { return d.y; })
      .attr("y1", function (d) { return d.x; })
      .attr("x2", function (d) { return d.parent.y; })
      .attr("y2", function (d) { return d.parent.x; })
      .style("fill", "none")
      .style("stroke", "#80B8FF")
      .style("stroke-width", 1.5);

    link.transition()
      .duration(self.duration)
      .attr("x1", function (d) { return d.y; })
      .attr("y1", function (d) { return d.x; })
      .attr("x2", function (d) { return d.parent.y; })
      .attr("y2", function (d) { return d.parent.x; });

    link.exit().transition()
      .duration(self.duration)
      .attr("x1", function (d) { return d.y; })
      .attr("y1", function (d) { return d.x; })
      .attr("x2", function (d) { return d.parent.y; })
      .attr("y2", function (d) { return d.parent.x; })
      .remove();

    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }
  
  toggle(d: any) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      d._children = null;
    }
    this.clickedEvt(d);
    this.update(d, true);
  }

  getBox(d: any): any {
    return document.getElementById(d)
  }
  
  clickedEvt(data: any) {
    console.log("Clicked Data: ", data);
  }
}