// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
// import
import "./ICryptoPunksMarket.sol";

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
    ICryptoPunksMarket public cryptopunks;
    uint public price;
    uint public preMintTimeout;
    uint public totalSupply = 10000;
    uint private _currentTokenId = 0;
    uint[] private _tokenIds;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint price_,
        address punks_,
        address proxy_
    ) ERC721(name_, symbol_) {
        owner = msg.sender;
        baseURI = baseURI_;
        price = price_;
        cryptopunks = ICryptoPunksMarket(punks_);
        proxyRegistryAddress = proxy_;
        preMintTimeout = block.timestamp + PRE_MINT_PERIOD;
    }

    /**
    * @dev Function to allow owner to set the array of token ids to be minted
    */
    function appendTokenIds(uint[] memory ids_) onlyOwner external
    {
        for (uint i = 0; i < ids_.length; i++) {
            _tokenIds.push(ids_[i]);
        }
    }

    /**
    * @dev Function to allow current punk owners to mint a corresponding token during the timeout period
    */
    function preMint(uint punkId, address to_) external
    {
        if (msg.sender != owner) {
            require(block.timestamp < preMintTimeout, "PRE_MINT_CLOSED");
            require(cryptopunks.punkIndexToAddress(punkId) == msg.sender, "NON_PUNK_OWNER");
            _mint(to_, punkId);
        } else {
            _mint(owner, punkId);
        }
    }

    function _mint(address to_) private {
        require(_currentTokenId < _tokenIds.length, "TOTAL_SUPPLY_MINTED");
        uint newTokenId = _tokenIds[_currentTokenId];
        while (_exists(newTokenId)) {
            _currentTokenId++;
            require(_currentTokenId < _tokenIds.length, "TOTAL_SUPPLY_MINTED");
            newTokenId = _tokenIds[_currentTokenId];
        }
        _mint(to_, newTokenId);
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
