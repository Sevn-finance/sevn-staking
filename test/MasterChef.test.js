const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

const SEVN = artifacts.require('/artifacts/Sevn');
const MasterChef = artifacts.require('/artifacts/MasterChef');
const MockERC20 = artifacts.require('/artifacts/MockERC20');

let perBlock = '1000';
const delay = ms => new Promise(res => setTimeout(res, ms));

contract('MasterChef', ([alice, bob, market, safu, treasure, minter]) => {

    let sevn, lp1, lp2, lp3, chef;


    beforeEach(async () => {

        //weth = await WETH.new({from: minter});
        sevn = await SEVN.new('SEVN','SEVN',{ from: minter });
    
        lp1 = await MockERC20.new('LPToken', 'LP1', '1000000', { from: minter });
        lp2 = await MockERC20.new('LPToken', 'LP2', '1000000', { from: minter });
        lp3 = await MockERC20.new('LPToken', 'LP3', '1000000', { from: minter });
        
        
        chef = await MasterChef.new(
            sevn.address, 
            market, 
            safu, 
            treasure, 
            perBlock, 
            '100', 
            '793200', 
            '57400', 
            '34500', 
            '114900', 
            { from: minter }
        );
        await sevn.addMinter(chef.address, { from: minter });
            
        await lp1.transfer(bob, '2000', { from: minter });
        await lp2.transfer(bob, '2000', { from: minter });
        await lp3.transfer(bob, '2000', { from: minter });

        await lp1.transfer(alice, '2000', { from: minter });
        await lp2.transfer(alice, '2000', { from: minter });
        await lp3.transfer(alice, '2000', { from: minter });
      
    });
    it('real case', async () => {

      await chef.add('2000', lp1.address, true, { from: minter });
      await chef.add('1000', lp2.address, true, { from: minter });
      await chef.add('500', lp3.address, true, { from: minter });
      await chef.add('500', lp3.address, true, { from: minter });
      await chef.add('500', lp3.address, true, { from: minter });
      await chef.add('500', lp3.address, true, { from: minter });
      await chef.add('500', lp3.address, true, { from: minter });
      await chef.add('100', lp3.address, true, { from: minter });
      await chef.add('100', lp3.address, true, { from: minter });

      assert.equal((await chef.poolLength()).toString(), "10");

      await time.advanceBlockTo('170');

      await lp1.approve(chef.address, '1000', { from: alice });
      assert.equal((await sevn.balanceOf(alice)).toString(), '0');
      await chef.deposit(1, '20', { from: alice });
      await chef.withdraw(1, '20', { from: alice });
      assert.equal((await sevn.balanceOf(alice)).toString(), '236');

      await sevn.approve(chef.address, '1000', { from: alice });
      await chef.enterStaking('20', { from: alice });
      await chef.enterStaking('0', { from: alice });
      await chef.enterStaking('0', { from: alice });
      await chef.enterStaking('0', { from: alice });
      assert.equal((await sevn.balanceOf(alice)).toString(), '570');

    })


    it("deposit/withdraw", async () => {
        await chef.add("1000", lp1.address, true, { from: minter });
        await chef.add("1000", lp2.address, true, { from: minter });
        await chef.add("1000", lp3.address, true, { from: minter });
    
        await lp1.approve(chef.address, "100", { from: alice });
        await chef.deposit(1, "20", { from: alice });
        await chef.deposit(1, "0", { from: alice });
        await chef.deposit(1, "40", { from: alice });
        await chef.deposit(1, "0", { from: alice });
        assert.equal((await lp1.balanceOf(alice)).toString(), "1940");
        await chef.withdraw(1, "10", { from: alice });
        assert.equal((await lp1.balanceOf(alice)).toString(), "1950");
        assert.equal((await sevn.balanceOf(alice)).toString(), "792");
    
        await lp1.approve(chef.address, "100", { from: bob });
        assert.equal((await lp1.balanceOf(bob)).toString(), "2000");
        await chef.deposit(1, "50", { from: bob });
        assert.equal((await lp1.balanceOf(bob)).toString(), "1950");
        await chef.deposit(1, "0", { from: bob });
        assert.equal((await sevn.balanceOf(bob)).toString(), "99");
        await chef.emergencyWithdraw(1, { from: bob });
        assert.equal((await lp1.balanceOf(bob)).toString(), "2000");
      });


      it("staking/unstaking", async () => {
        await chef.add("1000", lp1.address, true, { from: minter });
        await chef.add("1000", lp2.address, true, { from: minter });
        await chef.add("1000", lp3.address, true, { from: minter });
    
        await lp1.approve(chef.address, "10", { from: alice });
        await chef.deposit(1, "2", { from: alice }); //0
        await chef.withdraw(1, "2", { from: alice }); //1
    
        console.log((await sevn.balanceOf(alice)).toString());

        await sevn.approve(chef.address, "250", { from: alice });
        await chef.enterStaking("188", { from: alice }); //3
        assert.equal((await sevn.balanceOf(alice)).toString(), "10");
        await chef.enterStaking("10", { from: alice }); //4
        assert.equal((await sevn.balanceOf(alice)).toString(), "197");
        await chef.leaveStaking(198);
        assert.equal((await sevn.balanceOf(alice)).toString(), "593");
      });

      it("updaate multiplier", async () => {
        await chef.add("1000", lp1.address, true, { from: minter });
        await chef.add("1000", lp2.address, true, { from: minter });
        await chef.add("1000", lp3.address, true, { from: minter });
    
        await lp1.approve(chef.address, "100", { from: alice });
        await lp1.approve(chef.address, "100", { from: bob });
        await chef.deposit(1, "100", { from: alice });
        await chef.deposit(1, "100", { from: bob });
        await chef.deposit(1, "0", { from: alice });
        await chef.deposit(1, "0", { from: bob });
    
        await sevn.approve(chef.address, "100", { from: alice });
        await sevn.approve(chef.address, "100", { from: bob });
        await chef.enterStaking("50", { from: alice });
        await chef.enterStaking("100", { from: bob });
    
        await chef.updateMultiplier("0", { from: minter });
    
        await chef.enterStaking("0", { from: alice });
        await chef.enterStaking("0", { from: bob });
        await chef.deposit(1, "0", { from: alice });
        await chef.deposit(1, "0", { from: bob });
    
        assert.equal((await sevn.balanceOf(alice)).toString(), "544");
        assert.equal((await sevn.balanceOf(bob)).toString(), "98");
    
        await time.advanceBlockTo("265");
    
        await chef.enterStaking("0", { from: alice });
        await chef.enterStaking("0", { from: bob });
        await chef.deposit(1, "0", { from: alice });
        await chef.deposit(1, "0", { from: bob });
    
        assert.equal((await sevn.balanceOf(alice)).toString(), "544");
        assert.equal((await sevn.balanceOf(bob)).toString(), "98");
    
        await chef.leaveStaking("50", { from: alice });
        await chef.leaveStaking("100", { from: bob });
        await chef.withdraw(1, "100", { from: alice });
        await chef.withdraw(1, "100", { from: bob });
      });

});
