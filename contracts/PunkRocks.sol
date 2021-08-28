// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// Proxy contracts for OpenSea compatibility
contract OwnableDelegateProxy {}

contract ProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

contract PunkRocks is ERC721 {
    using SafeMath for uint32;
    using SafeMath for uint;
    using Strings for uint;

    uint public constant PRE_MINT_PERIOD = 7200; // 2 hours in seconds
    uint public constant MAX_MINT = 7;

    string public baseURI;
    address public owner;
    address public proxyRegistryAddress;
    uint public price;
    uint public preMintTimeout;
    uint public totalSupply;
    uint private _currentTokenId = 0;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint price_,
        uint totalSupply_,
        address proxy_
    ) ERC721(name_, symbol_) {
        owner = msg.sender;
        baseURI = baseURI_;
        price = price_;
        totalSupply = totalSupply_;
        proxyRegistryAddress = proxy_;
        preMintTimeout = block.timestamp + PRE_MINT_PERIOD;
    }

    function _mint(address to_) private {
        uint newTokenId = _getNextTokenId();
        require(newTokenId <= totalSupply, "TOTAL_SUPPLY_MINTED");
        _mint(to_, newTokenId);
        _incrementTokenId();
    }

    /**
    * @dev Owner function to mint an amount of tokens during the timeout period
    */
    function preMint(uint amount_, address to_) onlyOwner external
    {
        require(block.timestamp < preMintTimeout, "PRE_MINT_CLOSED");
        for (uint i = 0; i < amount_; i++) {
            _mint(to_);
        }
    }

    function _getNextTokenId() private view returns (uint) {
        return _currentTokenId.add(1);
    }

    function _incrementTokenId() private {
        _currentTokenId++;
    }

    /**
    * @dev ERC721 function for retreiving token specific metadata
    */
    function tokenURI(uint tokenId_) public view override returns (string memory) {
        require(_exists(tokenId_), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(baseURI, tokenId_.toString()));
    }

    /**
     *  @dev isApprovedForAll to whitelist user"s OpenSea proxy accounts to enable gas-less listings.
     */
    function isApprovedForAll(address owner_, address operator_)
        public
        view
        override
        returns (bool)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner_)) == operator_) {
            return true;
        }

        return super.isApprovedForAll(owner_, operator_);
    }

    /**
    * @dev Function to transfer sales proceeds to owner
    */
    function withdrawProceeds() external  {
        payable(owner).transfer(address(this).balance);
    }

    /**
    * @dev Function to mint up to MAX_MINT tokens to recipient
    */
    function mint(address to_) external payable {
        require(msg.value >= price, "MINT_PRICE_NOT_MET");
        require(block.timestamp >= preMintTimeout, "MINT_CLOSED");
        uint mintAmount = msg.value.div(price);
        if (mintAmount > MAX_MINT) {
            mintAmount = MAX_MINT;
        }
        for (uint i = 0; i < mintAmount; i++) {
            _mint(to_);
        }
    }
}
