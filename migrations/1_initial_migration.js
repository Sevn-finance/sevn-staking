
const MastefChef = artifacts.require('MasterChef');

module.exports = async function(deployer) {

  const Sevn = '';
  const marketaddr = '';
  const safuaddr = '';
  const treasureaddr = '';
  const SEVNPerSec = '2220000000000000000';
  const startTimeStamp = '';
  const farmPercent = '793200';
  const marketPercent = '57400';
  const safuPercent = '34500';
  const treasurePercent = '114900';

  await deployer.deploy(MastefChef, 
    Sevn,
    marketaddr,
    safuaddr,
    treasureaddr,
    SEVNPerSec,
    startTimeStamp,
    farmPercent,
    marketPercent,
    safuPercent,
    treasurePercent
  );

};


