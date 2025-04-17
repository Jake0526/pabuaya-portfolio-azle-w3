import React, { Component } from 'react';
// import { ApolloProvider, ApolloClient, InMemoryCache } from '@apollo/client';
import HomeContent from './content/HomeContent';

import { executeScript } from './script/script.js';

// const client = new ApolloClient({
//   uri: process.env.DFX_NETWORK !== "ic" ? `http://${process.env.CANISTER_ID_BACKEND}.raw.localhost:4943/graphql` : `https://${process.env.CANISTER_ID_BACKEND}.raw.icp0.io/graphql`,
//   cache: new InMemoryCache()
// })

export default class HomeComponent extends Component {
	constructor(props) {
    super(props);
  }

	componentDidMount() {
    executeScript();

    document.title = "Welcome to AJP website"

    document.body.className = "hold-transition layout-top-nav layout-navbar-fixed";
  }

	render() {
		return (
      <div className="wrapper">
        {/* <ApolloProvider client={client}> */}
          <HomeContent />
        {/* </ApolloProvider> */}
      </div>
		);
	}
};