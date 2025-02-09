/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */

//let data = localData;
let currentData;
let voteData;
const selectedNodes = new Set();
let backgroundData = [];
let userFilter = '';
let postFilter = '';
let typeFilterList = [];
let timeFrameFilter = '';
// Define the dimensions of the visualization.
// We're using a size that's convenient for displaying the graphic on
var width, height, svg, tooltip, simulation, link, node;
var cacheDuration = 1800000; // 1800000 = 30min cache
var threeDimensional = true;
// eslint-disable-next-line no-undef
const myForceGraph = ForceGraph3D()(document.getElementById('3d-graph'))
  .backgroundColor('white')
  .linkColor(() => '#0f0f0f') //Not working?
  .nodeOpacity(1)
  .height(document.getElementsByClassName('right')[0].offsetHeight)
  .width(document.getElementsByClassName('right')[0].offsetWidth)
  .nodeLabel('id')
  .nodeColor(d => d.color)
  .onNodeClick(node => {
    getCorrespondingNodes(node);
  })
  .onNodeRightClick(node => {
    addSelectNode(node);
  });

$(document).on('click', function() {
  document.getElementById('error').hidden = true;
});
//	filter button event handlers
$('.filter-btn').on('click', function(e) {
  var id = $(this).attr('value');
  console.log(id);
  if (typeFilterList.includes(id)) {
    typeFilterList.splice(typeFilterList.indexOf(id), 1);
  } else {
    typeFilterList.push(id);
  }
  typeFilterList.sort();
  filter();
});

document.addEventListener('DOMContentLoaded', function() {
  const sceneInfoMsg = document.querySelector('.scene-nav-info');
  sceneInfoMsg.innerHTML = `${sceneInfoMsg.innerHTML} Right Click Nodes to select.`;
});

// eslint-disable-next-line no-unused-vars
function exportData(type = 'current') {
  let remIrelData;
  let exportFileName;

  const currentSelFn = () => {
    remIrelData = currentData.nodes.map(el => ({
      ID: el.id,
      Group: el.group,
      PostId: 'postId' in el ? el.postId : null,
    }));
    exportFileName = 'current-nodes.csv';
  };

  if (type === 'current') currentSelFn();
  else if (type === 'selected') {
    remIrelData = Array.from(selectedNodes).map(el => ({
      ID: el.id,
      Group: el.group,
      PostId: 'postId' in el ? el.postId : null,
    }));
    exportFileName = 'selected-nodes.csv';
  } else currentSelFn();

  const csvFile = Papa.unparse(remIrelData, {
    delimiter: ',',
    header: true,
    newline: '\n',
  });

  const link = document.createElement('a');
  const blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', exportFileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function addSelectNode(node) {
  if (selectedNodes.has(node)) {
    selectedNodes.delete(node);
    node.color = node.initialColor;
    myForceGraph.nodeColor(myForceGraph.nodeColor());
    document.getElementById('select-node-num').innerHTML =
      Number(document.getElementById('select-node-num').innerHTML) - 1;
  } else {
    node.initialColor = node.color;
    node.color = 'yellow';
    selectedNodes.add(node);
    myForceGraph.nodeColor(myForceGraph.nodeColor());
    document.getElementById('select-node-num').innerHTML =
      Number(document.getElementById('select-node-num').innerHTML) + 1;
  }
}

// eslint-disable-next-line no-unused-vars
function clearSelectedNodes() {
  for (const node of selectedNodes) {
    node.color = node.initialColor;
  }
  document.getElementById('select-node-num').innerHTML = 0;
  myForceGraph.nodeColor(myForceGraph.nodeColor());
  selectedNodes.clear();
}

async function getData(start, step, noCache) {
  let cache = JSON.parse(sessionStorage.getItem('initial-data'));
  if (!noCache && cache && Date.now() - cache.timestamp < cacheDuration) {
    return cache.data;
  } else {
    return await axios({
      method: 'get',
      url: `https://api.yup.io/votes?start=${start}&limit=${step}`,
    }).then(function(response) {
      console.log(response);
      var data = [];
      response.data.forEach(element => {
        if (element.post.caption) {
          data.push({
            caption: element.post.caption,
            voter: element.voter,
            timestamp: element.timestamp,
            postId: element.postid,
          });
        }
      });
      let cacheData = JSON.stringify({
        timestamp: Date.now(),
        data: data,
      });
      console.log(data);
      sessionStorage.setItem('initial-data', cacheData);
      return data;
    });
  }
}

async function getUserData(users) {
  let fullData = [];
  await Promise.all(
    users.map(async user => {
      let cache = JSON.parse(sessionStorage.getItem(user + '-pre'));
      if (cache && Date.now() - cache.timestamp < cacheDuration) {
        fullData = [...fullData, ...cache.data];
      } else {
        await axios({
          method: 'get',
          url: `https://api.yup.io/votes/voter/${user}?start=0&limit=1000`,
        }).then(function(response) {
          console.log(response);
          var data = [];
          response.data.forEach(element => {
            if (element.post?.caption) {
              data.push({
                caption: element.post.caption,
                voter: element.voter,
                timestamp: element.timestamp,
                postId: element.postid,
              });
            }
          });
          let cacheData = JSON.stringify({
            timestamp: Date.now(),
            data: data,
          });
          try {
            sessionStorage.setItem(user + '-pre', cacheData);
          } catch (err) {
            sessionStorage.clear();
            sessionStorage.setItem(user + '-pre', cacheData);
          }
          fullData = [...fullData, ...data];
        });
      }
    }),
  );
  console.log(fullData);
  return fullData;
}

async function getPostData(id, caption, bypassCache = false) {
  let cache;
  if (!bypassCache) {
    cache = JSON.parse(sessionStorage.getItem(id + '-pre'));
  }
  if (cache && Date.now() - cache.timestamp < cacheDuration) {
    return cache.data;
  } else {
    let getCaption;
    if (!caption) {
      getCaption = await axios({
        method: 'get',
        url: `https://api.yup.io/posts/post/${id}`,
      }).then(function(response) {
        return response.data.caption;
      });
    }
    return axios({
      method: 'get',
      url: `https://api.yup.io/votes/post/${id}?start=0&limit=1000`,
    }).then(function(response) {
      console.log(response);
      var data = [];
      response.data.forEach(element => {
        data.push({
          caption: caption ? caption : getCaption,
          voter: element.voter,
          timestamp: element.timestamp,
          postId: id,
        });
      });
      let cacheData = JSON.stringify({
        timestamp: Date.now(),
        data: data,
      });

      console.log(data);
      sessionStorage.setItem(id + '-pre', cacheData);
      return data;
    });
  }
}
async function getPostDataURL(url) {
  let cache = JSON.parse(sessionStorage.getItem(url + '-pre'));
  if (cache && Date.now() - cache.timestamp < cacheDuration) {
    return cache.data;
  } else {
    let id = await axios
      .post(`https://api.yup.io/posts/post/caption`, {
        caption: url,
      })
      .then(function(response) {
        return response.data[0]._id.postid;
      });
    return axios({
      method: 'get',
      url: `https://api.yup.io/votes/post/${id}?start=0&limit=1000`,
    }).then(function(response) {
      console.log(response);
      var data = [];
      response.data.forEach(element => {
        data.push({
          caption: url,
          voter: element.voter,
          timestamp: element.timestamp,
          postId: id,
        });
      });
      let cacheData = JSON.stringify({
        timestamp: Date.now(),
        data: data,
      });

      console.log(data);
      sessionStorage.setItem(id + '-pre', cacheData);
      return data;
    });
  }
}

// eslint-disable-next-line no-unused-vars
function search() {
  let userLabel = document.getElementById('user-show-label');
  let input = document.getElementById('search-input').value;
  let url;
  try {
    url = new URL(input);
  } catch (e) {
    // console.log(e)
  }
  if (input && !url) {
    postFilter = '';
    userFilter = input.split(',');
    userLabel.innerText = input;
    userLabel.hidden = false;
    document.getElementById('user').checked = true;
    document.getElementById('user').value = input;
  } else {
    userFilter = '';
    console.log('postFilter');
    postFilter = input;
    userLabel.innerText = input;
    userLabel.hidden = false;
    document.getElementById('user').checked = true;
    document.getElementById('user').value = input;
  }
  filter();
}

// eslint-disable-next-line no-unused-vars
function savedUser() {
  userFilter = document.getElementById('user').value;
  filter();
}

// eslint-disable-next-line no-unused-vars
function allUsers() {
  userFilter = '';
  postFilter = '';
  document.getElementById('user').checked = false;
  filter();
}

// eslint-disable-next-line no-unused-vars
function changeTimeframe(value) {
  timeFrameFilter = value;
  filter();
}

// eslint-disable-next-line no-unused-vars
function change3D() {
  threeDimensional = !threeDimensional;
  filter();
}

function updateDetailsTab() {
  $('#node-name').text(currentData.id);
  $('#node-amount').text(currentData.nodes.length);
  $('#node-connections').text(currentData.links.length);
  if (document.readyState === 'complete') {
    const isEosName = /[a-z1-5]{12}/;
    if (isEosName.test(currentData.id)) {
      document.getElementById('user-deep-rel-block').hidden = false;
    } else {
      document.getElementById('user-deep-rel-block').hidden = true;
    }
  }
}

// eslint-disable-next-line no-unused-vars
function showNodeList() {
  $('#nodeList').show();
}

function createTable(data) {
  let header = ['name', 'group'];
  let table = document.getElementById('table');
  table.deleteTHead();
  data.nodes.forEach(element => {
    let row = table.insertRow();
    for (let key of header) {
      let cell = row.insertCell();
      let text = document.createTextNode(element[key]);
      cell.appendChild(text);
    }
  });
  let thead = table.createTHead();
  let row = thead.insertRow();
  for (let key of header) {
    let th = document.createElement('th');
    let text = document.createTextNode(key.charAt(0).toUpperCase() + key.slice(1));
    th.appendChild(text);
    row.appendChild(th);
  }
}
// We're about to tell the force layout to start its
// calculations. We do, however, want to know when those
// calculations are complete, so before we kick things off
// we'll define a function that we want the layout to call
// once the calculations are done.
function draw(data) {
  width = document.body.clientWidth - 100 - document.getElementsByClassName('left')[0].clientWidth;
  height = document.getElementsByClassName('content')[0].clientHeight;
  createTable(data);
  svg?.remove();
  svg = d3
    .select('#container')
    .append('svg')
    .attr('width', width)
    .attr('height', height);
  tooltip = d3
    .select('body')
    .append('div')
    .attr('class', 'tooltip');
  link?.remove();
  link = svg
    .selectAll('.link')
    .data(data.links)
    .enter()
    .append('line')
    .attr('class', 'link');
  node?.remove();
  node = d3
    .select('#nodes')
    .selectAll('div')
    .data(data.nodes)
    .enter()
    .append('div')
    .style('fill', function(d) {
      return d.id;
    })
    //we return the exact flag of each node from the image
    .attr('class', function(d) {
      return 'node node-' + d.group;
    })
    //we call some classes to handle the mouse
    .on('click', clickHandler)
    .on('mouseover', mouseoverHandler)
    .on('mousemove', mouseMoving)
    .on('mouseout', mouseoutHandler);
  simulation = d3
    .forceSimulation()
    .force('charge', d3.forceManyBody().strength(-10))
    .force(
      'link',
      d3
        .forceLink()
        .id(function(d) {
          return d.id;
        })
        .distance(10),
    )
    .force('x', d3.forceX(width / 2))
    .force('y', d3.forceY(height / 2))
    .on('tick', tick);
  simulation.nodes(data.nodes);
  simulation.force('link').links(data.links);
}

function tick(e) {
  // First let's reposition the nodes. As the force
  // layout runs it updates the `x` and `y` properties
  // that define where the node should be positioned.
  // To move the node, we set the appropriate SVG
  // attributes to their new values.
  node
    .style('left', function(d) {
      return d.x + 'px';
    })
    .style('top', function(d) {
      return d.y + 'px';
    });

  // We also need to update positions of the links.
  // For those elements, the force layout sets the
  // `source` and `target` properties, specifying
  // `x` and `y` values in each case.
  link
    .attr('x1', function(d) {
      return d.source.x;
    })
    .attr('y1', function(d) {
      return d.source.y;
    })
    .attr('x2', function(d) {
      return d.target.x;
    })
    .attr('y2', function(d) {
      return d.target.y;
    });
}

//hover over a flag
//the tooltip with the name of the node is going to show up
function mouseoverHandler(d) {
  console.log(d);
  tooltip.transition().style('opacity', 0.9);
  tooltip.html('<p>' + d['id'] + '</p>');
}
//leaving a flag
//the tooltip will disappear
function mouseoutHandler(d) {
  tooltip.transition().style('opacity', 0);
}

function mouseMoving(d) {
  tooltip
    .style('top', d3.event.pageY - 10 + 'px')
    .style('left', d3.event.pageX + 10 + 'px')
    .style('color', '#090909');
}

function clickHandler(d) {
  tooltip?.remove();
  console.log(d);
  getCorrespondingNodes(d);
}
function setSpinner(type) {
  if (type === 'spinner') {
    document.getElementById('spinner').hidden = false;
    document.getElementById('container').hidden = true;
    document.getElementById('3d-graph').hidden = true;
  } else if (type === 'normal') {
    document.getElementById('spinner').hidden = true;
    document.getElementById('3d-graph').hidden = true;
    document.getElementById('container').hidden = false;
  } else if (type === 'error') {
    document.getElementById('spinner').hidden = true;
    document.getElementById('user-show-label').hidden = true;
    document.getElementById('error').hidden = false;
  } else {
    document.getElementById('spinner').hidden = true;
    document.getElementById('container').hidden = true;
    document.getElementById('3d-graph').hidden = false;
  }
}
async function filter() {
  setSpinner('spinner');
  console.log('Need to cache');
  let filteredData;
  if (userFilter) {
    let data = await getUserData(userFilter);
    filteredData = generateData(data);
    if (userFilter[0]) currentData.id = userFilter[0];
  } else if (postFilter) {
    let url, data;
    try {
      url = new URL(postFilter) ? new URL(postFilter) : false;
    } catch (e) {}
    try {
      if (url) {
        url = url.href.replace(/\/$/, '');
        console.log(url);
        data = await getPostDataURL(url);
      } else {
        data = await getPostData(postFilter);
      }
    } catch (e) {
      console.log(e);
      setSpinner('error');
      return;
    }
    filteredData = generateData(data);
  } else {
    filteredData = generateData(voteData);
  }
  if (threeDimensional) {
    setSpinner('3D');
    draw3D(filteredData);
  } else {
    setSpinner('normal');
    draw(filteredData);
  }

  updateDetailsTab();
}
function generateData(data) {
  let nodes = [];
  let links = [];
  data?.forEach(element => {
    if (nodes.length <= 2000) {
      if (
        !timeFrameFilter ||
        dateFns.differenceInDays(new Date(), new Date(parseInt(element.timestamp))) <= timeFrameFilter
      ) {
        let url;
        try {
          url = new URL(element.caption);
        } catch (e) {
          // console.log(e)
        }

        url = url
          ? filterHostname(url.hostname)
          : {
              group: 'general',
              color: '#3a3a3a',
            };
        if (typeFilterList && typeFilterList.includes('user')) {
          if (!typeFilterList.includes(url.group)) {
            nodes.push({
              id: element.caption,
              group: url.group,
              color: url.color,
              postId: element.postId,
            });
          }
        } else {
          if (!typeFilterList?.includes(url.group)) {
            if (!userFilter || userFilter.includes(element.voter)) {
              if (element.caption) {
                nodes.push({
                  id: element.caption,
                  group: url.group,
                  color: url.color,
                  postId: element.postId,
                });
                nodes.push({
                  id: element.voter,
                  group: 'user',
                  color: '#dadada',
                });
                links.push({
                  source: element.voter,
                  target: element.caption,
                });
              }
            }
          }
        }
      }
    }
  });
  nodes = [...new Map(nodes.map(item => [item['id'], item])).values()];
  currentData = {
    id: typeFilterList?.length ? typeFilterList : 'All Recent',
    nodes: nodes,
    links: links,
  };
  return {
    nodes,
    links,
  };
}

function filterHostname(hostname) {
  if (hostname.includes('youtube')) {
    return {
      group: 'youtube',
      color: '#c4302b',
    };
  } else if (hostname.includes('twitter')) {
    return {
      group: 'twitter',
      color: '#1da1f2',
    };
  } else if (hostname.includes('reddit')) {
    return {
      group: 'reddit',
      color: 'orangered',
    };
  } else {
    return {
      group: 'general',
      color: '#3a3a3a',
    };
  }
}

// eslint-disable-next-line no-unused-vars
async function getUserDeepData() {
  setSpinner('spinner');
  const nodes = [...currentData.nodes];
  const posts = nodes.filter(node => node.postId);
  let currentUserId = currentData.id;
  let limitNodes = Number(document.getElementById('limit-nodes').value);
  limitNodes = isNaN(limitNodes) ? 0 : limitNodes;

  let limitLinks = Number(document.getElementById('limit-links').value);
  limitLinks = isNaN(limitLinks) ? 0 : limitLinks;

  if (limitNodes === 0) limitNodes = 5000;
  if (limitLinks === 0) limitLinks = 5000;

  const retData = { nodes: [], links: [] };

  let bypassCache = false;
  if (document.getElementById('bypass-cache').checked) bypassCache = true;

  for (const node of posts) {
    const data = await getPostData(node.postId, node.id, bypassCache);
    const votes = getPostVotes(data, node);
    retData.nodes = [...retData.nodes, ...votes.nodes];
    retData.links = [...retData.links, ...votes.links];
    if (retData.nodes.length > limitNodes) break;
    if (retData.links.length > limitLinks) break;
  }
  uniqueNodesId = [];
  uniqueNodes = [];
  retData.nodes.forEach(node => {
    if (!uniqueNodesId.includes(node.id)) {
      uniqueNodes.push(node);
      uniqueNodesId.push(node.id);
    }
  });
  retData.nodes = uniqueNodes;

  if (threeDimensional) {
    setSpinner('3D');
    draw3D(retData);
  } else {
    setSpinner('normal');
    draw(retData);
  }

  currentData.id = currentUserId;
  currentData.nodes = retData.nodes;
  currentData.links = retData.links;
  updateDetailsTab();
}

async function getCorrespondingNodes(node) {
  setSpinner('spinner');
  if (node.group !== 'user') {
    let data = await getPostData(node.postId, node.id);
    let votes = getPostVotes(data, node);
    if (threeDimensional) {
      setSpinner('3D');
      draw3D(votes);
    } else {
      setSpinner('normal');
      draw(votes);
    }
  } else {
    let userLabel = document.getElementById('user-show-label');
    userFilter = [node.id];
    userLabel.innerText = userFilter;
    userLabel.hidden = false;
    document.getElementById('user').checked = true;
    document.getElementById('user').value = userFilter;
    let data = await getUserData(userFilter);
    let votes = getUserVotes(data, node);
    if (threeDimensional) {
      setSpinner('3D');
      draw3D(votes);
    } else {
      setSpinner('normal');
      draw(votes);
    }
  }
  updateDetailsTab();
}

function getPostVotes(data, node) {
  let nodes = [];
  let links = [];
  nodes.push(node);
  data.forEach(element => {
    if (element.caption === node.id) {
      nodes.push({
        id: element.voter,
        group: 'user',
        color: '#dadada',
      });
      links.push({
        source: element.voter,
        target: element.caption,
      });
    }
  });
  nodes = [...new Map(nodes.map(item => [item['id'], item])).values()];

  currentData = {
    id: node.id,
    nodes: nodes,
    links: links,
  };
  return {
    nodes,
    links,
  };
}

function getUserVotes(data, node) {
  let nodes = [];
  let links = [];
  nodes.push(node);
  data.forEach(element => {
    if (element.voter === node.id) {
      let url;
      try {
        url = new URL(element.caption);
      } catch (e) {
        // console.log(e)
      }
      url = url
        ? filterHostname(url.hostname)
        : {
            group: 'general',
            color: '#3a3a3a',
          };
      nodes.push({
        id: element.caption,
        group: url.group,
        color: url.color,
        postId: element.postId,
      });
      links.push({
        source: element.caption,
        target: element.voter,
      });
    }
  });
  nodes = [...new Map(nodes.map(item => [item['id'], item])).values()];

  currentData = {
    id: node.id,
    nodes: nodes,
    links: links,
  };
  return {
    nodes,
    links,
  };
}

function draw3D(data) {
  updateDetailsTab();
  myForceGraph.graphData(data);
}
async function start(start, step) {
  voteData = await getData(start, step);
  filter();
}
function updateNodesLoadingText(text) {
  document.getElementById('nodes-loading').innerText = text;
}
// eslint-disable-next-line no-unused-vars
function loadNewNodes() {
  filter();
  document.getElementById('nodes-loading-container-done').hidden = true;
}
async function loadDataBackground(start, step, end) {
  let cache = JSON.parse(sessionStorage.getItem('initial-data'));
  if (cache && Date.now() - cache.timestamp < cacheDuration) {
    if (cache.data.length > 499) {
      document.getElementById('nodes-loading-container').hidden = true;
      return;
    }
  }
  updateNodesLoadingText(`Loading: ${start} out of ${end}`);
  let newData = await getData(start, step, true);
  backgroundData = [...backgroundData, ...newData];
  if (start === end) {
    voteData = backgroundData;
    let cacheData = JSON.stringify({
      timestamp: Date.now(),
      data: voteData,
    });
    sessionStorage.setItem('initial-data', cacheData);
    document.getElementById('nodes-loading-container').hidden = true;
    document.getElementById('nodes-loading-container-done').hidden = false;
    return;
  }
  loadDataBackground(start + step, step, end);
}
start(0, 50);
loadDataBackground(0, 50, 500);
