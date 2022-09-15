
const MastefChef = artifacts.require('MasterChef');

module.exports = async function(deployer) {

  const Sevn = '0x2c3f07314ba8dA7A99E50BB1B9a3Dfd659881E63';
  const marketaddr = '0xB1E568c93ff8AEeD790AD594D7831810879dDfA7';
  const safuaddr = '0xB1E568c93ff8AEeD790AD594D7831810879dDfA7';
  const treasuteaddr = '0xB1E568c93ff8AEeD790AD594D7831810879dDfA7';
  const SEVNPerBlock = '30000000000000000000';
  const startBlock = '12990017';
  const stakingPercent = '793200';
  const marketPercent = '57400';
  const safuPercent = '34500';
  const treasurePercent = '114900';

  await deployer.deploy(MastefChef, 
    Sevn,
    marketaddr,
    safuaddr,
    treasuteaddr,
    SEVNPerBlock,
    startBlock,
    stakingPercent,
    marketPercent,
    safuPercent,
    treasurePercent
  );

};


