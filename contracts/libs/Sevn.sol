// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract Mintable {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _minters;

    // modifier for mint function
    modifier onlyMinter() {
        require(isMinter(msg.sender), "caller is not the minter");
        _;
    }

    function getMinterLength() public view returns (uint256) {
        return EnumerableSet.length(_minters);
    }

    function isMinter(address account) public view returns (bool) {
        return EnumerableSet.contains(_minters, account);
    }

    function getMinter(uint256 _index) public view returns (address){
        require(_index <= getMinterLength() - 1, "Mintable: index out of bounds");
        return EnumerableSet.at(_minters, _index);
    }

    
    function _addMinter(address addMinter) internal returns (bool) {
        return EnumerableSet.add(_minters, addMinter);
    }

    function _delMinter(address delMinter) internal returns (bool) {
        return EnumerableSet.remove(_minters, delMinter);
    }

}

contract Sevn is ERC20, Ownable, Mintable{

     uint256 public constant preMineSupply = 45350000 * 1e18; // 45 350 000
    uint256 public constant maxSupply = 350000000 * 1e18; // 350 000 000

    constructor(string memory name, string memory symbol) ERC20(name, symbol){
        _addMinter(msg.sender);
        _mint(msg.sender, preMineSupply);
    }

    function mint(address _to, uint256 _amount) public onlyMinter returns(bool) {
        _mint(_to, _amount);
        require(totalSupply() <= maxSupply, "SEVN: totalSupply can not > maxSupply");
        return true;
    }

    function burn(uint256 _amount) public onlyOwner {
        _burn(msg.sender, _amount);
    }

    function addMinter(address _minter) public onlyOwner returns (bool) {
        require(_minter != address(0), "SEVN: _minter is the zero address");
        return _addMinter(_minter);
    }

    function delMinter(address _minter) public onlyOwner returns (bool) {
        require(_minter != address(0), "SEVN: _minter is the zero address");
        return _delMinter(_minter);
    }
}   