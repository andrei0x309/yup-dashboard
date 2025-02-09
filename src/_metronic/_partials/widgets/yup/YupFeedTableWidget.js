/* eslint-disable no-script-url,jsx-a11y/anchor-is-valid,jsx-a11y/img-redundant-alt */
import React, { Component } from 'react';
import { Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
// import { Loader } from './loader'
import './custom.css';
import Skeleton from '@material-ui/lab/Skeleton';

// const styles = theme => ({
//   Category: {
//     marginBottom: '0px'
//   }
// })

const pageStyle = {
  emojyCategory: {
    cursor: 'default',
  },
  paginationLink: {
    color: 'inherit',
  },
};

class YupFeedTableWidget extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      items: { 1: null, 2: null, 3: null, 4: null, 5: null },
      page: 1,
    };
    this.updateData = this.updateData.bind(this);
    this.getCreateVoteV3 = this.getCreateVoteV3.bind(this);
    this.getPostVoteV2 = this.getPostVoteV2.bind(this);
  }

  componentDidMount() {
    const pageNum = Number(this.props.pageIndex);
    if (!isNaN(pageNum) && pageNum > 0 && pageNum <= 5) {
      this.setState({
        page: pageNum,
      });
      this.updateData(pageNum, 50);
    } else this.updateData(1, 50);
    // setInterval(this.updateData.bind(null, 1, 50), 60000);
  }
  async updateData(page, limit) {
    let [createVoteV3, postVoteV2] = await Promise.all([this.getCreateVoteV3(0, limit), this.getPostVoteV2(0, limit)]);
    let allVotes = createVoteV3.actions.concat(postVoteV2.actions);
    allVotes.sort(function(a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    allVotes.forEach(item => {
      item.timestamp = this.convertUTCDateToLocalDate(new Date(item.timestamp));
    });
    let items = allVotes.slice(10 * (page - 1), 10 * page);
    this.getPostData(page, items);
  }

  convertUTCDateToLocalDate(date) {
    var newDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return newDate;
  }
  async getCreateVoteV3(skip, limit) {
    return new Promise((resolve, reject) => {
      fetch(
        'https://eos.hyperion.eosrio.io/v2/history/get_actions?account=yupyupyupyup&filter=*%3Acreatevotev3&skip=' +
          skip +
          '&limit=' +
          limit +
          '&sort=desc',
      )
        .then(res => res.json())
        .then(
          result => {
            resolve(result);
          },
          error => {
            reject(error);
          },
        );
    });
  }
  async getPostVoteV2(skip, limit) {
    return new Promise((resolve, reject) => {
      fetch(
        'https://eos.hyperion.eosrio.io/v2/history/get_actions?account=yupyupyupyup&filter=*%3Apostvotev2&skip=' +
          skip +
          '&limit=' +
          limit +
          '&sort=desc',
      )
        .then(res => res.json())
        .then(
          result => {
            resolve(result);
          },
          error => {
            reject(error);
          },
        );
    });
  }
  async getPostData(page, items) {
    let fullData = [];
    var itemsProcessed = 0;
    //Checks if items for this page dont exist or if the first items isnt the same -> makes api calls
    if (!this.state.items[page] || items[0].global_sequence !== this.state.items[page][0].vote.global_sequence) {
      this.setState({
        isLoaded: false,
      });

      await items.forEach(async vote => {
        if (vote.act.data.postid) {
          await fetch('https://api.yup.io/posts/post/' + vote.act.data.postid, {
            method: 'GET',
          })
            .then(res => {
              try {
                return res.json();
              } catch (e) {
                console.log(e);
                this.setState({
                  isLoaded: false,
                  error: e,
                });
              }
            })
            .then(result => {
              if (result) {
                fullData.push({
                  post: {
                    caption: result.caption,
                    tag: result.tag,
                  },
                  vote: vote,
                });
              }
            });
        } else {
          fullData.push({
            post: {
              caption: vote.act.data.caption,
              tag: vote.act.data.tag,
            },
            vote: vote,
          });
        }
        itemsProcessed++;
        if (itemsProcessed === items.length) {
          fullData.sort(function(a, b) {
            return new Date(b.vote.timestamp).getTime() - new Date(a.vote.timestamp).getTime();
          });
          let newItems = this.state.items;
          newItems[page] = fullData;
          this.setState({
            isLoaded: true,
            items: newItems,
            page: page,
          });
        }
      });
    } else {
      this.setState({
        isLoaded: true,
        page: page,
      });
    }
  }
  nextPage() {
    if (this.state.page < 5) {
      let page = this.state.page + 1;
      this.setState({
        isLoaded: false,
        page: page,
      });
      this.updateData(page, 50);
    }
  }
  lastPage() {
    if (this.state.page > 1) {
      let page = this.state.page - 1;
      this.setState({
        isLoaded: false,
        page: page,
      });
      this.updateData(page, 50);
    }
  }
  createRating(n) {
    let rating = n.rating;
    let like = n.like;
    var ratingMap = {
      '1': '3',
      '2': '4',
      '3': '5',
    };
    var ratingMapFalse = {
      '1': '2',
      '2': '1',
    };
    if (like) {
      rating = ratingMap[rating];
    } else {
      rating = ratingMapFalse[rating];
    }
    var elements = [];
    var colorMap = {
      '1': '#BE1E2D',
      '2': '#F08C28',
      '3': '#F0C800',
      '4': '#7FBA1B',
      '5': '#00EAB7',
    };
    for (let i = 0; i < rating; i++) {
      elements.push(
        <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="20px" height="20px">
          <g fill={colorMap[rating]}>
            {' '}
            <circle cx="50%" cy="50%" r="25" />
          </g>
        </svg>,
      );
    }
    return elements;
  }
  createPagination() {}
  render() {
    const { error, isLoaded, items } = this.state;
    if (error) {
      return <div>Error: {error.message}</div>;
    } else {
      return (
        <div className={`card card-custom card-stretch gutter-b`}>
          {/* Head */}
          <div className="card-header border-0 py-5">
            <h2 className="card-title align-items-start flex-column">
              <span className="card-label font-weight-bolder text-dark">History</span>
            </h2>
          </div>
          {/* Body */}
          <div className="card-body pt-0 pb-3">
            <div className="tab-content">
              <div className="table-responsive">
                <table className="table table-head-custom  table-borderless table-vertical-center">
                  <thead>
                    <tr className="text-left">
                      <th className="text-left">Time</th>
                      <th className="text-left">User</th>
                      <th>Content</th>
                      <th className="text-left">Rating</th>
                      <th className="text-left">Platform</th>
                    </tr>
                  </thead>
                  {isLoaded && (
                    <tbody>
                      {items[this.state.page].map(item => (
                        <tr key={item.vote.global_sequence}>
                          <td>
                            <span className="text-dark-75 d-block font-size-lg">
                              {new Date(item.vote.timestamp).toLocaleDateString()}{' '}
                              {new Date(item.vote.timestamp).toLocaleTimeString()}
                            </span>
                          </td>
                          <td>
                            <a
                              href={`https://app.yup.io/${item.vote.act.data.voter}`}
                              className="text-dark-75 d-block font-size-lg"
                            >
                              {item.vote.act.data.voter}
                            </a>
                          </td>
                          <td>
                            <a href={item.post.caption} className="text-primary d-block font-size-lg">
                              {item.post.caption.substring(0, 30)}
                              {item.post.caption.length > 29 && '...'}
                            </a>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div>
                                <span>
                                  {item.vote.act.data.category === 'intelligence' && (
                                    <span role="img" style={pageStyle.emojyCategory} aria-label="intelligence">
                                      💡
                                    </span>
                                  )}
                                  {item.vote.act.data.category === 'funny' && (
                                    <span role="img" style={pageStyle.emojyCategory} aria-label="funny">
                                      😂
                                    </span>
                                  )}
                                  {item.vote.act.data.category === 'popularity' && (
                                    <span role="img" style={pageStyle.emojyCategory} aria-label="popularity">
                                      ❤️
                                    </span>
                                  )}
                                  {item.vote.act.data.category === 'beautiful' && (
                                    <span role="img" style={pageStyle.emojyCategory} aria-label="beautiful">
                                      🌸
                                    </span>
                                  )}
                                  {item.vote.act.data.category === 'original' && (
                                    <span role="img" style={pageStyle.emojyCategory} aria-label="original">
                                      🦄
                                    </span>
                                  )}
                                </span>
                              </div>
                              <span className="text-dark-75 text-left font-size-lg" style={{ marginTop: '-1px' }}>
                                {this.createRating(item.vote.act.data)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="text-dark-75 text-left d-block font-size-lg">
                              {item.post.tag
                                ? item.post.tag
                                    .split('.')[0]
                                    .charAt(0)
                                    .toUpperCase() + item.post.tag.split('.')[0].slice(1)
                                : new URL(item.post.caption).host
                                    .split('.')[0]
                                    .charAt(0)
                                    .toUpperCase() + new URL(item.post.caption).host.split('.')[0].slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  )}
                </table>
              </div>
              <div className="d-flex justify-content-center">
                {!isLoaded && (
                  <span style={{ width: '100%' }} className="text-dark-75 font-size-lg pr-5">
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                    <h1>
                      <Skeleton />
                    </h1>
                  </span>
                )}
              </div>
            </div>
            <div className="separator separator-dashed my-7"></div>
            <Pagination className="float-right" size="lg">
              <Pagination.Prev onClick={() => this.lastPage()} />
              {[...Array(6)].map((_, i) =>
                i === 0 ? (
                  ''
                ) : (
                  <li className={`page-item ${this.state.page === i ? 'active' : ''} `} key={i}>
                    <Link className={`page-link`} onClick={() => this.updateData(i, 50)} to={`/page/${i}`}>
                      {i}
                    </Link>
                  </li>
                ),
              )}
              <Pagination.Next onClick={() => this.nextPage()} />
            </Pagination>
          </div>
        </div>
      );
    }
  }
}

export default YupFeedTableWidget;
