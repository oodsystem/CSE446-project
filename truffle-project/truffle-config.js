module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545, // Standard Ganache UI port
      network_id: "*", // Match any network id
    },
  },
  compilers: {
    solc: {
      version: "0.8.21", // Fetch exact version from solc-bin
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
