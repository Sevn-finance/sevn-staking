// SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IMasterChef.sol";
import "./libs/Sevn.sol";


// MasterChef is the master of SEVN. He can make SEVN and he is a fair guy.
//
// Note that it's ownable and the owner wields tremendous power. The ownership
// will be transferred to a governance smart contract once SEVN is sufficiently
// distributed and the community can show to govern itself.
//
// Have fun reading it. Hopefully it's bug-free. God bless.
contract MasterChef is Ownable {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Info of each user.
    struct UserInfo {
        uint256 amount; // How many LP tokens the user has provided.
        uint256 rewardDebt; // Reward debt. See explanation below.
        //
        // We do some fancy math here. Basically, any point in time, the amount of SEVNs
        // entitled to a user but is pending to be distributed is:
        //
        //   pending reward = (user.amount * pool.accSEVNPerShare) - user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accSEVNPerShare` (and `lastRewardBlock`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }
    // Info of each pool.
    struct PoolInfo {
        IERC20 lpToken; // Address of LP token contract.
        uint256 allocPoint; // How many allocation points assigned to this pool. SEVNs to distribute per block.
        uint256 lastRewardBlock; // Last block number that SEVNs distribution occurs.
        uint256 accSEVNPerShare; // Accumulated SEVNs per share, times 1e12. See below.
    }
    // The Sevn TOKEN!
    Sevn immutable public SEVN;
    //Pools, Farms, Market, Safu percent decimals
    uint256 immutable public percentDec = 1000000;
    //Pools and Farms percent from token per block
    uint256 immutable public stakingPercent;
    //Developers percent from token per block
    uint256 immutable public marketPercent;
    //Safu fund percent from token per block
    uint256 immutable public safuPercent;
    //Treasure fund percent from token per block
    uint256 immutable public treasurePercent;
    
    // Market address.
    address public marketaddr;
    // Safu fund.
    address public safuaddr;
    // Treasure fund.
    address public treasureaddr;
    
    // Last block then develeper withdraw market and safu fee
    uint256 public lastBlockMarketWithdraw;
    // SEVN tokens created per block.
    uint256 public SEVNPerBlock;
    // Bonus muliplier for early SEVN makers.
    uint256 public BONUS_MULTIPLIER = 1;
    
    // The migrator contract. It has a lot of power. Can only be set through governance (owner).
    IMigratorChef public migrator;
    // Info of each pool.
    PoolInfo[] public poolInfo;
    // Info of each user that stakes LP tokens.
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    // Total allocation poitns. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint = 0;
    // The block number when SEVN mining starts.
    uint256 public startBlock;
    // Deposited amount SEVN in MasterChef
    uint256 public depositedSevn;

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );

    constructor( 
        Sevn _SEVN,
        address _marketaddr,
        address _safuaddr,
        address _treasureaddr,
        uint256 _SEVNPerBlock,
        uint256 _startBlock,
        uint256 _stakingPercent,
        uint256 _marketPercent,
        uint256 _safuPercent,
        uint256 _treasurePercent
    ){
        SEVN = _SEVN;
        marketaddr = _marketaddr;
        safuaddr = _safuaddr;
        treasureaddr = _treasureaddr;
        SEVNPerBlock = _SEVNPerBlock;
        startBlock = _startBlock;
        stakingPercent = _stakingPercent;
        marketPercent = _marketPercent;
        safuPercent = _safuPercent;
        treasurePercent = _treasurePercent;
        lastBlockMarketWithdraw = _startBlock;
          
        // staking pool
        poolInfo.push(PoolInfo({
            lpToken: _SEVN,
            allocPoint: 1000,
            lastRewardBlock: startBlock,
            accSEVNPerShare: 0
        }));

        totalAllocPoint = 1000;

    }

    function updateMultiplier(uint256 multiplierNumber) public onlyOwner {
        BONUS_MULTIPLIER = multiplierNumber;
    }

    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }

    function withdrawDevAndMarketFee() public {
        require(lastBlockMarketWithdraw < block.number, 'wait for new block');
        uint256 multiplier = getMultiplier(lastBlockMarketWithdraw, block.number);
        uint256 SEVNReward = multiplier.mul(SEVNPerBlock);
        SEVN.mint(marketaddr, SEVNReward.mul(marketPercent).div(percentDec));
        SEVN.mint(safuaddr, SEVNReward.mul(safuPercent).div(percentDec));
        SEVN.mint(treasureaddr, SEVNReward.mul(treasurePercent).div(percentDec));
        lastBlockMarketWithdraw = block.number;
    }

    // Add a new lp to the pool. Can only be called by the owner.
    // XXX DO NOT add the same LP token more than once. Rewards will be messed up if you do.
    function add( uint256 _allocPoint, IERC20 _lpToken, bool _withUpdate ) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        uint256 lastRewardBlock = block.number > startBlock ? block.number : startBlock;
        totalAllocPoint = totalAllocPoint.add(_allocPoint);
        poolInfo.push(
            PoolInfo({
                lpToken: _lpToken,
                allocPoint: _allocPoint,
                lastRewardBlock: lastRewardBlock,
                accSEVNPerShare: 0
            })
        );
    }

    // Update the given pool's SEVN allocation point. Can only be called by the owner.
    function set( uint256 _pid, uint256 _allocPoint, bool _withUpdate) public onlyOwner {
        if (_withUpdate) {
            massUpdatePools();
        }
        totalAllocPoint = totalAllocPoint.sub(poolInfo[_pid].allocPoint).add(_allocPoint);
        poolInfo[_pid].allocPoint = _allocPoint;
    }

    // Set the migrator contract. Can only be called by the owner.
    function setMigrator(IMigratorChef _migrator) public onlyOwner {
        migrator = _migrator;
    }

    // Migrate lp token to another lp contract. Can be called by anyone. We trust that migrator contract is good.
    function migrate(uint256 _pid) public {
        require(address(migrator) != address(0), "migrate: no migrator");
        PoolInfo storage pool = poolInfo[_pid];
        IERC20 lpToken = pool.lpToken;
        uint256 bal = lpToken.balanceOf(address(this));
        lpToken.safeApprove(address(migrator), bal);
        IERC20 newLpToken = migrator.migrate(lpToken);
        require(bal == newLpToken.balanceOf(address(this)), "migrate: bad");
        pool.lpToken = newLpToken;
    }

    // Return reward multiplier over the given _from to _to block.
    function getMultiplier(uint256 _from, uint256 _to) public view returns (uint256) {
         return _to.sub(_from).mul(BONUS_MULTIPLIER);
    }

    // View function to see pending SEVNs on frontend.
    function pendingSEVN(uint256 _pid, address _user) external view returns (uint256){
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][_user];
        uint256 accSEVNPerShare = pool.accSEVNPerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (_pid == 0){
            lpSupply = depositedSevn;
        }
        if (block.number > pool.lastRewardBlock && lpSupply != 0) {
            uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
            uint256 SEVNReward = multiplier.mul(SEVNPerBlock).mul(pool.allocPoint).div(totalAllocPoint).mul(stakingPercent).div(percentDec);
            accSEVNPerShare = accSEVNPerShare.add(SEVNReward.mul(1e12).div(lpSupply));
        }
        return user.amount.mul(accSEVNPerShare).div(1e12).sub(user.rewardDebt);
    }

    // Update reward vairables for all pools. Be careful of gas spending!
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; ++pid) {
            updatePool(pid);
        }
    }

    // Update reward variables of the given pool to be up-to-date.
    function updatePool(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        if (block.number <= pool.lastRewardBlock) {
            return;
        }
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        if (_pid == 0){
            lpSupply = depositedSevn;
        }
        if (lpSupply <= 0) {
            pool.lastRewardBlock = block.number;
            return;
        }
        uint256 multiplier = getMultiplier(pool.lastRewardBlock, block.number);
        uint256 SEVNReward = multiplier.mul(SEVNPerBlock).mul(pool.allocPoint).div(totalAllocPoint).mul(stakingPercent).div(percentDec);
        SEVN.mint(address(this), SEVNReward);
        pool.accSEVNPerShare = pool.accSEVNPerShare.add(SEVNReward.mul(1e12).div(lpSupply));
        pool.lastRewardBlock = block.number;
    }

    // Deposit LP tokens to MasterChef for SEVN allocation.
    function deposit(uint256 _pid, uint256 _amount) public {

        require (_pid != 0, 'deposit SEVN by staking');

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        updatePool(_pid);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accSEVNPerShare).div(1e12).sub(user.rewardDebt);
            safeSEVNTransfer(msg.sender, pending);
        }
        pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
        user.amount = user.amount.add(_amount);
        user.rewardDebt = user.amount.mul(pool.accSEVNPerShare).div(1e12);
        emit Deposit(msg.sender, _pid, _amount);
    }

    // Withdraw LP tokens from MasterChef.
    function withdraw(uint256 _pid, uint256 _amount) public {

        require (_pid != 0, 'withdraw SEVN by unstaking');

        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(_pid);
        uint256 pending = user.amount.mul(pool.accSEVNPerShare).div(1e12).sub(user.rewardDebt);
        safeSEVNTransfer(msg.sender, pending);
        user.amount = user.amount.sub(_amount);
        user.rewardDebt = user.amount.mul(pool.accSEVNPerShare).div(1e12);
        pool.lpToken.safeTransfer(address(msg.sender), _amount);
        emit Withdraw(msg.sender, _pid, _amount);
    }

    // Stake SEVN tokens to MasterChef
    function enterStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        updatePool(0);
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(pool.accSEVNPerShare).div(1e12).sub(user.rewardDebt);
            if(pending > 0) {
                safeSEVNTransfer(msg.sender, pending);
            }
        }
        if(_amount > 0) {
            pool.lpToken.safeTransferFrom(address(msg.sender), address(this), _amount);
            user.amount = user.amount.add(_amount);
            depositedSevn = depositedSevn.add(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSEVNPerShare).div(1e12);
        emit Deposit(msg.sender, 0, _amount);
    }

    // Withdraw SEVN tokens from STAKING.
    function leaveStaking(uint256 _amount) public {
        PoolInfo storage pool = poolInfo[0];
        UserInfo storage user = userInfo[0][msg.sender];
        require(user.amount >= _amount, "withdraw: not good");
        updatePool(0);
        uint256 pending = user.amount.mul(pool.accSEVNPerShare).div(1e12).sub(user.rewardDebt);
        if(pending > 0) {
            safeSEVNTransfer(msg.sender, pending);
        }
        if(_amount > 0) {
            user.amount = user.amount.sub(_amount);
            pool.lpToken.safeTransfer(address(msg.sender), _amount);
            depositedSevn = depositedSevn.sub(_amount);
        }
        user.rewardDebt = user.amount.mul(pool.accSEVNPerShare).div(1e12);
        emit Withdraw(msg.sender, 0, _amount);
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) public {
        PoolInfo storage pool = poolInfo[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        pool.lpToken.safeTransfer(address(msg.sender), user.amount);
        emit EmergencyWithdraw(msg.sender, _pid, user.amount);
        user.amount = 0;
        user.rewardDebt = 0;
    }

    // Safe SEVN transfer function, just in case if rounding error causes pool to not have enough SEVNs.
    function safeSEVNTransfer(address _to, uint256 _amount) internal {
        uint256 SEVNBal = SEVN.balanceOf(address(this));
        if (_amount > SEVNBal) {
            SEVN.transfer(_to, SEVNBal);
        } else {
            SEVN.transfer(_to, _amount);
        }
    }

    function setMarketAddress(address _marketaddr) public onlyOwner {
        marketaddr = _marketaddr;
    }
    function setTreasureAddress(address _treasureaddr) public onlyOwner {
        treasureaddr = _treasureaddr;
    }
    function setSafuAddress(address _safuaddr) public onlyOwner{
        safuaddr = _safuaddr;
    }
    function updateSEVNPerBlock(uint256 newAmount) public onlyOwner {
        require(newAmount <= 60 * 1e18, 'Max per block 60 SEVN');
        require(newAmount >= 1 * 1e18, 'Min per block 1 SEVN');
        SEVNPerBlock = newAmount;
    }
}