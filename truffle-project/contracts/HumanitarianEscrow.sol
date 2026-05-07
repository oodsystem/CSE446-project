// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HumanitarianEscrow {
    
    enum Role { None, UN_Arbiter, Donor, Relief_Agency }
    enum Status { Pending, In_Transit, Delivered, Disputed, Resolved }

    struct User {
        string name;
        Role role;
        uint256 reputation;
        bool isRegistered;
    }

    struct Mission {
        uint256 id;
        address donor;
        string category;
        uint256 maxBudget;
        string region;
        Status status;
        address selectedAgency;
        uint256 agreedPrice;
        address[] bidders;
    }

    address public arbiter;
    uint256 public missionCount;
    
    mapping(address => User) public users;
    mapping(uint256 => Mission) public missions;
    // Tracks: MissionID => AgencyAddress => BidAmount
    mapping(uint256 => mapping(address => uint256)) public missionBids;

    event MissionPosted(uint256 missionId, address donor);
    event BidPlaced(uint256 missionId, address agency, uint256 amount);
    event MissionFunded(uint256 missionId, address agency, uint256 amount);
    event DeliveredMarked(uint256 missionId);
    event FundsReleased(uint256 missionId, address agency, uint256 amount);

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Only UN_Arbiter allowed");
        _;
    }

    modifier onlyDonor() {
        require(users[msg.sender].role == Role.Donor, "Only Donors allowed");
        _;
    }

    modifier onlyAgency() {
        require(users[msg.sender].role == Role.Relief_Agency, "Only Agencies allowed");
        _;
    }

    constructor() {
        arbiter = msg.sender;
        users[msg.sender] = User("UN Arbiter HQ", Role.UN_Arbiter, 100, true);
    }

    // 1. Registration
    function registerUser(string memory _name, Role _role) public {
        require(!users[msg.sender].isRegistered, "Address already registered");
        require(_role != Role.UN_Arbiter, "Cannot register as Arbiter");

        uint256 initialRep = (_role == Role.Relief_Agency) ? 100 : 0;
        users[msg.sender] = User(_name, _role, initialRep, true);
    }

    // 2. Post a Relief Mission
    function postMission(string memory _category, uint256 _maxBudgetEth, string memory _region) public onlyDonor {
        missionCount++;
        Mission storage m = missions[missionCount];
        m.id = missionCount;
        m.donor = msg.sender;
        m.category = _category;
        m.maxBudget = _maxBudgetEth * 1 ether;
        m.region = _region;
        m.status = Status.Pending;

        emit MissionPosted(missionCount, msg.sender);
    }

    // 3. Pledge to Deliver (Agency Bidding)
    function pledgeToMission(uint256 _missionId, uint256 _bidAmountEth) public onlyAgency {
        Mission storage m = missions[_missionId];
        uint256 bidInWei = _bidAmountEth * 1 ether;

        require(m.status == Status.Pending, "Mission not open for bids");
        require(bidInWei <= m.maxBudget, "Bid exceeds donor max budget");
        require(users[msg.sender].reputation >= 40, "Reputation too low to bid");

        if (missionBids[_missionId][msg.sender] == 0) {
            m.bidders.push(msg.sender);
        }
        missionBids[_missionId][msg.sender] = bidInWei;

        emit BidPlaced(_missionId, msg.sender, bidInWei);
    }

    // 4. Fund & Escrow
    function selectAndFund(uint256 _missionId, address _agency) public payable onlyDonor {
        Mission storage m = missions[_missionId];
        uint256 bidAmount = missionBids[_missionId][_agency];

        require(m.donor == msg.sender, "Only the mission donor can fund");
        require(bidAmount > 0, "Agency has not bid on this mission");
        require(msg.value >= bidAmount, "Insufficient Ether sent");

        m.selectedAgency = _agency;
        m.agreedPrice = bidAmount;
        m.status = Status.In_Transit;

        // Refund excess Ether if donor sent too much
        uint256 excess = msg.value - bidAmount;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit MissionFunded(_missionId, _agency, bidAmount);
    }

    // 5. Aid Delivery & Payout
    function markAsDelivered(uint256 _missionId) public onlyAgency {
        require(missions[_missionId].selectedAgency == msg.sender, "Not the assigned agency");
        missions[_missionId].status = Status.Delivered;
        emit DeliveredMarked(_missionId);
    }

    function approveAndPay(uint256 _missionId) public onlyDonor {
        Mission storage m = missions[_missionId];
        require(m.donor == msg.sender, "Only donor can approve payout");
        require(m.status == Status.Delivered, "Mission not marked delivered");

        _processPayment(m);
        m.status = Status.Resolved;
    }

    // 6. Dispute & Resolution
    function raiseDispute(uint256 _missionId) public onlyDonor {
        require(missions[_missionId].donor == msg.sender, "Not your mission");
        missions[_missionId].status = Status.Disputed;
    }

    function resolveDispute(uint256 _missionId, bool _agencyFault) public onlyArbiter {
        Mission storage m = missions[_missionId];
        require(m.status == Status.Disputed, "Mission is not in dispute");

        if (_agencyFault) {
            // Outcome A: Refund Donor
            users[m.selectedAgency].reputation = (users[m.selectedAgency].reputation > 30) ? users[m.selectedAgency].reputation - 30 : 0;
            payable(m.donor).transfer(m.agreedPrice);
        } else {
            // Outcome B: False Alarm, pay Agency
            _processPayment(m);
        }
        m.status = Status.Resolved;
    }

    // Internal helper for fee calculation and transfer
    function _processPayment(Mission storage m) internal {
        uint256 feePercent = (m.agreedPrice < 2 ether) ? 2 : 1;
        uint256 fee = (m.agreedPrice * feePercent) / 100;
        uint256 payout = m.agreedPrice - fee;

        users[m.selectedAgency].reputation += 15;
        payable(m.selectedAgency).transfer(payout);
        
        emit FundsReleased(m.id, m.selectedAgency, payout);
    }
}
