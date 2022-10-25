const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const { expect, assert } = require('chai');

const SEVN = artifacts.require('/artifacts/Sevn');
const MasterChef = artifacts.require('/artifacts/MasterChef');
const MockERC20 = artifacts.require('/artifacts/MockERC20');
const BigNumber = require("bignumber.js");
const web3 = require('web3');

contract('MasterChef', ([alice, carol, dev, treasury, safu, minter, bob]) => {

  before(async function () {
    this.devPercent = 200000
    this.treasuryPercent = 200000
    this.safuPercent = 100000
    this.lpPercent = 1000000 - this.devPercent - this.treasuryPercent - this.safuPercent
    this.sevnPerSec = 100
    this.secOffset = 1
    this.tokenOffset = 1
  })

  beforeEach(async function () {
      this.sevn = await SEVN.new('SEVN','SEVN',{ from: minter })
  })

  it("should set correct state variables", async function () {
    // We make start time 60 seconds past the last block
    const startTime = (await time.latest()).addn(60)
    this.chef = await MasterChef.new(
      this.sevn.address,
      dev,
      safu,
      treasury,
      this.sevnPerSec,
      startTime,
      this.lpPercent,
      this.devPercent,
      this.safuPercent,
      this.treasuryPercent,
      { from: minter }
    )

    await this.sevn.addMinter(this.chef.address, { from: minter })

    const sevn = await this.chef.SEVN()
    const devAddr = await this.chef.marketaddr()
    const treasuryAddr = await this.chef.treasureaddr()
    const safuAddr = await this.chef.safuaddr()
    const owner = await this.sevn.owner()
    const devPercent = await this.chef.marketPercent()
    const treasuryPercent = await this.chef.treasurePercent()
    const safuPercent = await this.chef.safuPercent()

    expect(sevn).to.equal(this.sevn.address)
    expect(devAddr).to.equal(dev)
    expect(treasuryAddr).to.equal(treasury)
    expect(safuAddr).to.equal(safu)
    expect(owner).to.equal(minter)
    expect(new BigNumber(devPercent).toFixed()).to.equal(`${this.devPercent}`)
    expect(new BigNumber(treasuryPercent).toFixed()).to.equal(`${this.treasuryPercent}`)
    expect(new BigNumber(safuPercent).toFixed()).to.equal(`${this.safuPercent}`)

  })

  it("should allow dev, treasury and investor to update themselves", async function () {
    const startTime = (await time.latest()).addn(60)
    this.chef = await MasterChef.new(
      this.sevn.address,
      dev,
      safu,
      treasury,
      this.sevnPerSec,
      startTime,
      this.lpPercent,
      this.devPercent,
      this.safuPercent,
      this.treasuryPercent,
      { from: minter }
    )


    expect(await this.chef.marketaddr()).to.equal(dev)

    await expect(this.chef.setMarketAddress(bob, {from: bob})).to.be.revertedWith("Ownable: caller is not the owner")
    await this.chef.setMarketAddress(bob, {from: minter});
    expect(await this.chef.marketaddr()).to.equal(bob)

    await expect(this.chef.setTreasureAddress(bob, {from: bob})).to.be.revertedWith("Ownable: caller is not the owner")
    await this.chef.setTreasureAddress(bob, {from: minter})
    expect(await this.chef.treasureaddr()).to.equal(bob)

    await expect(this.chef.setSafuAddress(bob, {from: bob})).to.be.revertedWith("Ownable: caller is not the owner")
    await this.chef.setSafuAddress(bob, {from: minter});
    expect(await this.chef.safuaddr()).to.equal(bob)

  });

  
  context("With ERC/LP token added to the field ", function () {
    beforeEach(async function () {
      this.lp = await MockERC20.new("LPToken", "LP", "10000000000") // b=3
      await this.lp.transfer(alice, "1000") // b=4
      await this.lp.transfer(bob, "1000") // b=5
      await this.lp.transfer(carol, "1000") // b=6

      this.lp2 = await MockERC20.new("LPToken2", "LP2", "10000000000") // b=7
      await this.lp2.transfer(alice, "1000") // b=8
      await this.lp2.transfer(bob, "1000") // b=9
      await this.lp2.transfer(carol, "1000") // b=10

      this.lp3 = await MockERC20.new("LPToken3", "LP3", "10000000000") // b=7
      await this.lp2.transfer(alice, "1000") // b=8
      await this.lp2.transfer(bob, "1000") // b=9
      await this.lp2.transfer(carol, "1000") // b=10

      this.lp4 = await MockERC20.new("LPToken4", "LP4", "10000000000") // b=7
      await this.lp2.transfer(alice, "1000") // b=8
      await this.lp2.transfer(bob, "1000") // b=9
      await this.lp2.transfer(carol, "1000") // b=10

      this.lp5 = await MockERC20.new("LPToken5", "LP5", "10000000000") // b=7
      await this.lp2.transfer(alice, "1000") // b=8
      await this.lp2.transfer(bob, "1000") // b=9
      await this.lp2.transfer(carol, "1000") // b=10
    })


    it("should check rewarder added and set properly", async function () {
      const startTime = (await time.latest()).addn(60)
      this.chef = await MasterChef.new(
        this.sevn.address,
        dev,
        safu,
        treasury,
        this.sevnPerSec,
        startTime,
        this.lpPercent,
        this.devPercent,
        this.safuPercent,
        this.treasuryPercent,
        { from: minter }
      )

      await this.chef.add("100", this.lp.address, false, {from: minter})
      await this.chef.set("0", "200", false, {from: minter})
      expect(new BigNumber((await this.chef.poolInfo(0)).allocPoint).toFixed()).to.equal("200")
    })

    it("should allow emergency withdraw from MasterChefJoeV2", async function () {
      const startTime = (await time.latest()).addn(60)
      this.chef = await MasterChef.new(
        this.sevn.address,
        dev,
        safu,
        treasury,
        this.sevnPerSec,
        startTime,
        this.lpPercent,
        this.devPercent,
        this.safuPercent,
        this.treasuryPercent,
        { from: minter }
      )

      await this.chef.add("100", this.lp.address, false, {from: minter})

      await this.lp.approve(this.chef.address, "1000", {from: bob})
      await this.chef.deposit(0, "100", {from: bob})

      expect(new BigNumber(await this.lp.balanceOf(bob)).toFixed()).to.equal("900")

      await this.chef.emergencyWithdraw(0, {from: bob})
      expect(new BigNumber(await this.lp.balanceOf(bob)).toFixed()).to.equal("1000")

    })

    it("should give out SEVNs only after farming time", async function () {
      
      this.devPercent = 57400
      this.treasuryPercent = 114900
      this.safuPercent = 34500
      this.lpPercent = 793200
      this.sevnPerSec = web3.utils.toWei('20', 'ether')

      const startTime = (await time.latest()).add(new BN('60'))

      expect(
        this.devPercent + 
        this.treasuryPercent + 
        this.safuPercent + 
        this.lpPercent, 1000000);

      this.chef = await MasterChef.new(
        this.sevn.address,
        dev,
        safu,
        treasury,
        this.sevnPerSec,
        startTime,
        this.lpPercent,
        this.devPercent,
        this.safuPercent,
        this.treasuryPercent,
        { from: minter }
      )

      await this.sevn.addMinter(this.chef.address, {from: minter})
        
      await this.chef.add("100", this.lp.address, false, {from: minter})
      
      
      await this.lp.approve(this.chef.address, "1000", {from: bob})
      await this.chef.deposit(0, "100", {from: bob})

      await advanceTimeAndBlock(42) // t-11, b=89
      
      await this.chef.deposit(0, "0", {from: bob})  // t-10, b=90
      // Bob should have:
      // 0 SevnToken
      expect(new BigNumber(await this.sevn.balanceOf(bob)).toFixed()).to.equal("0")

      await advanceTimeAndBlock(8) // t-2, b=91

      await this.chef.deposit(0, "0", {from: bob})  // t-1, b=92
      expect(new BigNumber(await this.sevn.balanceOf(bob)).toFixed()).to.equal("0")
      await advanceTimeAndBlock(10) // t+9, b=93

      await this.chef.deposit(0, "0", {from: bob})  // t+11, b=94
      // Bob should have:
      // with LP procent: 20 * 0.7932 = 15,864
      // 10s * 15,864 = 158,64 (+15,864) SevnToken
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(bob), 'ether'))).to.be.within(158.64, 174.504)
      await advanceTimeAndBlock(4) // t+15, b=95
      await this.chef.deposit(0, "0", {from: bob})  // t+16, b=96

      await this.chef.withdrawDevAndMarketFee(); // t+17, b=97
      
      //console.log(new BigNumber(await time.latest()).toFixed() - new BigNumber(startTime).toFixed())


      // At this point:
      //   Bob should have:
      //   158.64 + 6*15,864 = 253,824 (+15,864) SevnToken
      //   Dev should have: 17*1,148 = 19,516 (+1,148)
      //   Treasury should have: 17*2,298 = 39,066 (+2,298)
      //   Safe should hafe: 17*0,69 = 11,73 (+0,69)d

      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(bob), 'ether'))).to.be.within(253.824, 269.688)
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(dev), 'ether'))).to.be.within(19,516, 20.664)
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(treasury), 'ether'))).to.be.within(39.066, 41.364)
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(safu), 'ether'))).to.be.within(11.73, 12.42)
                
      await this.chef.set(0, 88, false, {from: minter}) // t+18, b=98

      await this.chef.add("5", this.lp2.address, false, {from: minter})  // t+19, b=99
      await this.chef.add("5", this.lp3.address, false, {from: minter})  // t+20, b=100
      await this.chef.add("1", this.lp4.address, false, {from: minter})  // t+21, b=101

      await expect(this.chef.add("1", this.lp5.address, false, {from: bob})).to.be.revertedWith("Ownable: caller is not the owner")  // t+22, b=102
      await expect(this.chef.set(0, 74, false, {from: bob})).to.be.revertedWith("Ownable: caller is not the owner")  // t+23, b=103
      await expect(this.chef.add("1", this.lp4.address, false, {from: minter})).to.be.revertedWith("add: LP already added")  // t+24, b=104

      await this.chef.add("1", this.lp5.address, false, {from: minter})  // t+25, b=105

      await this.lp2.approve(this.chef.address, "1000", {from: alice}) // t+26, b=106
      await this.lp2.approve(this.chef.address, "1000", {from: carol}) // t+27, b=107
  
      await this.chef.deposit(1, "100", {from: alice})  // t+28, b=108
      await this.chef.deposit(1, "200", {from: carol})  // t+29, b=109

      await advanceTimeAndBlock(20) // t+49 + 1, b=110

      await this.chef.deposit(1, 0, {from: alice})  // t+51, b=111
      await this.chef.deposit(1, 0, {from: carol})  // t+52, b=112

      // At this point:
      //   Alice should have:
      //   24 * (0,7932 * 100 / 300) = 6,3456 (+ 0,2644) SevnToken
      //   Carol should have: 
      //   23 * (0,7932 * 200 / 300) = 12,1624 (+ 0,5288)
      
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(alice), 'ether'))).to.be.within(6.3456, 6.61)
      expect(parseFloat(web3.utils.fromWei(await this.sevn.balanceOf(carol), 'ether'))).to.be.within(11.73, 12.1624)

    })
  })

  async function advanceTimeAndBlock(duration) {
    await time.increase(duration)
    await time.advanceBlock()
  }

})

