var React = require('react');
var UserProfile = require('./user_profile.js').UserProfile;
var LinkedStateMixin = require('react-addons-linked-state-mixin');
var Fuse = require('fuse.js');

var Filters = React.createClass({

  getDefaultProps() {
    return {onChange: null, show_unclaimed: false, search_query: '', mode: 'UROP'};
  },

  onChangeQuery(event) {
    var new_query = event.target.value;
    this.props.onChange('search_query', new_query);
  },

  onChangeUnclaimed(event) {
    this.props.onChange('show_unclaimed', event.target.checked);
  },

  render() {
    var urop_only = <div/>;
    if(this.props.mode=='UROP') {
      urop_only = (
        <div className='checkbox' style={{marginLeft: '10px'}}>
          <label><input type='checkbox'  onChange={this.onChangeUnclaimed} checked={this.props.show_unclaimed}/>Show unmatched UROPS only</label>
        </div>
      );
    }
    return (
      <div className='panel panel-default'>
        <div className='panel-body'>
          <div className='form-inline'>
            <div className='form-group'>
              <input className='form-control' onChange={this.onChangeQuery} type='search' value={this.props.search_query} placeholder="Search"/>
            </div>
            {urop_only}
          </div>
        </div>
      </div>
    );
  }
});

function apply_search(users, query) {
  var options = {
    caseSensitive: false,
    keys: ['email', 'name', 'statement', 'research']
  };
  var fuse = new Fuse(users, options);
  return fuse.search(query);
}

var Browse = React.createClass({

  getDefaultProps() {
    return {users: [], current_user: []};
  },

  getInitialState() {
    return {kind: 'UROP', show_unclaimed: true, search_query: ''};
  },

  get_pill(kind, name) {
    var kls;
    if (kind==this.state.kind) {
      kls = "active";
    } else {
      kls = "";
    }
    var setKind = event=>this.setState({kind: kind});
    return (
      <li role="presentation" className={kls}>
        <a href="#" onClick={setKind}>{name}</a>
      </li>
    );
  },

  setKind(kind) {
    this.setState({kind: kind});
  },

  apply_filters() {

    var users = this.props.users.filter(user=>{
      let conditions = []
      conditions.push(user.data.kind == this.state.kind);
      if(this.state.show_unclaimed) {
        conditions.push(user.host == null);
      }
      return conditions.reduce((a,b)=>a&&b, true);
    }
    );
    var query = this.state.search_query;
    if(query.length > 0) {
      users = apply_search(users, query);
    }
    users.sort((a,b)=>{
      if (!a.data.approved) return -1;
      else {
        if(Date.parse(a.data.date_uploaded) < Date.parse(b.data.date_uploaded)) {
          return 1;
        } else {
          return -1;
        }
      }
    });
    return users;
  },

  onClaim(user_id, should_claim) {
    var method;
    if (should_claim) {
      method = 'POST';
    } else {
      method = 'DELETE';
    }
    $.ajax({
      url: `/host/current/urops/${user_id}`,
      method: method,
      success: result=>{
      }
    });
  },

  onApprove(child, user_id) {
    var payload = {approve: true};
    $.ajax({
      url: `/host/${user_id}`,
      method: 'PUT',
      success: result=>{
        if(result.status == 'ok') {
            child.setState({approved: true});
        } else {
          console.log(`Approval error: ${result.status}`);
        }
      },
      data: JSON.stringify(payload)
    });
  },

  onFilterChanged(field, value) {
    var d = {}
    d[field] = value;
    this.setState(d);
  },

  render() {
    var urop_pill = this.get_pill('UROP', 'Browse UROPs');
    var host_pill = this.get_pill('Host', 'Browse hosts');
    var users = this.apply_filters();
    var profiles = users.map(user=> {
      let show_claim = true;
      return (<UserProfile  host={this.props.current_user}  onClaim={this.onClaim} onApprove={this.onApprove} user={user} key={user.data.user_id} show_claim={show_claim}/>);
    }
    );
    return (
      <div>
        <ul className='nav nav-pills'>
          {urop_pill}
          {host_pill}
        </ul>
        <Filters mode={this.state.kind} onChange={this.onFilterChanged} search_query={this.state.search_query} show_unclaimed={this.state.show_unclaimed}/>
        {profiles}
      </div>
    );
  }
});

module.exports = {Browse};
