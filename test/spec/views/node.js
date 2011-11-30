describe("Node", function () {

  var parent, child;
  var parentView, childView;

  beforeEach(function () {
    window.graph = new Data.Graph(seed);
    
    parent = graph.set(null, {
      type: '/type/section',
      name: "First Section",
      document: undefined
    });
    child = graph.set(null, {
      type: '/type/text',
      content: "Lorem ipsum dolor sit amet",
      document: undefined
    });
    parent.html_id = 'parent01';
    child.html_id = 'child01';
    
    parentView = new Node({
      parent: null,
      root: null,
      level: 0,
      model: parent
    });
    
    childView = new Node({
      parent: parent,
      root: parentView,
      level: 1,
      model: child
    });
  });

  afterEach(function () {
    delete window.graph;
  });

  it("should have the class 'content-node', the id as described by the model and should not be draggable", function () {
    expect($(childView.el).hasClass('content-node')).toBe(true);
    expect($(childView.el).attr('id')).toBe('child01')
    expect($(childView.el).attr('draggable')).toBe('false');
  });

  describe("initialize", function () {
    it("should set parent, level and root from the options object", function () {
      expect(childView.parent).toBe(parent);
      expect(childView.root).toBe(parentView);
      expect(childView.level).toBe(1);
    });
    it("should controls and afterControls subviews", function () {
      expect(childView.comments instanceof Comments).toBe(true);
      expect(childView.comments.model).toBe(child);
      expect(childView.afterControls instanceof Controls).toBe(true);
      expect(childView.afterControls.root).toBe(parentView);
      expect(childView.afterControls.level).toBe(1);
      expect(childView.afterControls.model).toBe(parent);
      expect(childView.afterControls.position.parent).toBe(parent);
      expect(childView.afterControls.position.after).toBe(child);
    });
  });

  describe("on 'last-child-changed'", function () {
    var tmp, isLast;

    beforeEach(function () {
      tmp = isLastChild;
      isLastChild = function () {
        return isLast;
      };
    });

    afterEach(function () {
      isLastChild = tmp;
    });

    it("should render the controls", function () {
      var controls = childView.afterControls;
      spyOn(controls, 'render');
      child.trigger('last-child-changed');
      expect(controls.render).toHaveBeenCalled();
    });

    it("should trigger the event on the model's parent if the model is the parents last child", function () {
      var lastChildChangedSpy = bindSpy(parent, 'last-child-changed');
      isLast = false;
      child.trigger('last-child-changed');
      expect(lastChildChangedSpy).not.toHaveBeenCalled();
      isLast = true;
      child.trigger('last-child-changed');
      expect(lastChildChangedSpy).toHaveBeenCalled();
    });
  });

  describe("Events", function () {
    beforeEach(function () {
      //parentView.render();
      childView.render();
    });

    it("should toggle the visibility of the comments when the user clicks on the comments icon", function () {
      var toggleSpy = childView.comments.toggle = jasmine.createSpy();
      childView.$('.toggle-comments').trigger('click');
      expect(toggleSpy).toHaveBeenCalled();
    });

    it("should remove the node when the user clicks on the remove button", function () {
      spyOn(window, 'removeChild');
      childView.$('.remove-node').trigger('click');
      expect(removeChild).toHaveBeenCalledWith(parent, child);
    });

    it("should trigger the move state when the user clicks on the move button", function () {
      parentView.transitionTo = function (state) {
        StateMachine.transitionTo.call(this, state);
        if (this.state === state) {
          childView.transitionTo(state);
        }
      }
      expect(parentView.state).toBe('read');
      expect(childView.state).toBe('read');
      // switch to move state
      childView.$('.toggle-move-node').trigger('click');
      expect(parentView.state).toBe('moveTarget');
      expect(childView.state).toBe('move');
      expect(parentView.movedNode).toBe(child);
      expect(parentView.movedParent).toBe(parent);
      // and back to write state
      childView.$('.toggle-move-node').trigger('click');
      expect(parentView.state).toBe('write');
      expect(childView.state).toBe('write');
    });

    it("should select the node when you click on it in write mode", function () {
      spyOn(childView, 'select');
      $(childView.el).trigger('click');
      expect(childView.select).not.toHaveBeenCalled();
      childView.transitionTo('write');
      $(childView.el).trigger('click');
      expect(childView.select).toHaveBeenCalled();
    });

    it("should have the class 'active' when the mouse is hovering", function () {
      expect($(childView.el).hasClass('active')).toBe(false);
      $(childView.el).trigger('mouseover');
      expect($(childView.el).hasClass('active')).toBe(true);
      $(childView.el).trigger('mouseout');
      expect($(childView.el).hasClass('active')).toBe(false);
    });
  });

  describe("select", function () {
    it("should call the root views deselect method and add the class 'selected'", function () {
      spyOn(parentView, 'deselect');
      expect($(childView.el).hasClass('selected')).toBe(false);
      childView.select();
      expect($(childView.el).hasClass('selected')).toBe(true);
      expect(parentView.deselect).toHaveBeenCalled();
    });
  });

  describe("deselect", function () {
    it("should remove the 'selected' class", function () {
      childView.select();
      expect($(childView.el).hasClass('selected')).toBe(true);
      childView.deselect();
      expect($(childView.el).hasClass('selected')).toBe(false);
    });
  });

  describe("focus", function () {
    it("should be a function that should be overwritten by subclasses", function () {
      expect(typeof childView.focus).toBe('function');
    });
  });

  describe("makeEditable", function () {
    var el;

    beforeEach(function () {
      el = $('<div />').appendTo(document.body);
    });

    afterEach(function () {
      el.remove();
    });

    it("should initialize the element with the current property value", function () {
      childView.makeEditable(el, 'content');
      expect(el.html()).toBe(child.get('content'));
    });

    it("should take a default value", function () {
      child.set({ content: "" });
      childView.makeEditable(el, 'content', "Enter Content");
      expect(el.html()).toMatch(/Enter Content/);
      expect(el.hasClass('empty')).toBe(true);
    });

    it("should be editable in the 'write' state", function () {
      childView.makeEditable(el, 'content', "Enter Content");
      spyOn(window.editor, 'activate').andCallThrough();
      el.trigger('click');
      expect(window.editor.activate).not.toHaveBeenCalled();
      childView.transitionTo('write');
      el.trigger('click');
      expect(window.editor.activate).toHaveBeenCalled();
      expect(el.attr('contenteditable')).toBe('true');
    });

    it("should update the model", function () {
      childView.makeEditable(el, 'content', "Enter Content");
      childView.transitionTo('write');
      el.html("New Content").click();
      window.editor.trigger('changed');
      expect(child.get('content')).toBe("New Content");
    });

    it("should pass custom options to proper", function () {
      spyOn(window.editor, 'activate').andCallThrough();
      childView.makeEditable(el, 'content', "Enter Content", { markup: true });
      childView.transitionTo('write');
      el.trigger('click');
      var options = window.editor.activate.mostRecentCall.args[1];
      expect(options.markup).toBe(true);
    });

    it("should use a custom update function", function () {
      var updateSpy = jasmine.createSpy();
      childView.makeEditable(el, 'content', "Enter Content", {}, updateSpy);
      childView.transitionTo('write');
      el.html("New Content").click();
      window.editor.trigger('changed');
      expect(updateSpy).toHaveBeenCalledWith(child, 'content', "New Content");
    });
  });

  describe("State", function () {
    it("should be in 'read' state initially", function () {
      expect(childView.state).toBe('read');
    });
    it("should transition to new states together with it's controls subview", function () {
      var controls = childView.afterControls;
      expect(childView.state).toBe('read');
      expect(controls.state).toBe('read');
      childView.transitionTo('move');
      expect(childView.state).toBe('move');
      expect(controls.state).toBe('move');
      // And it shouldn't transition from state 'move' to state 'moveTarget'
      childView.transitionTo('moveTarget');
      expect(childView.state).toBe('move');
      expect(controls.state).toBe('move');
    });
    it("should have the class 'being-moved' in move state", function () {
      expect($(childView.el).hasClass('being-moved')).toBe(false);
      childView.transitionTo('move');
      expect($(childView.el).hasClass('being-moved')).toBe(true);
      childView.transitionTo('write');
      expect($(childView.el).hasClass('being-moved')).toBe(false);
    });
  });

  describe("Inheritance and Instanciation", function () {
    var renderMethod = function () { return this; }
    ,   statesObject = { read: { enter: function () { alert("read"); } } }
    ,   subclass;
    
    beforeEach(function () {
      subclass = Node.define('/type/foo', {
        render: renderMethod
      }, {
        states: statesObject
      });
    });
    
    afterEach(function () {
      delete Node.subclasses['/type/foo'];
    });
    
    it("should let me define sublasses", function () {
      expect(typeof Node.subclasses).toBe('object');
      
      expect(Node.subclasses['/type/foo']).toBeTruthy();
      expect(Node.subclasses['/type/foo']).toBe(subclass);
    });
    
    it("should create the instance of the right class", function () {
      var tmp = Node.subclasses;
      Node.subclasses = {};
      
      expect(function () { Node.create(parent); }).toThrow();
      expect(function () { Node.create(child); }).toThrow();
      
      var sectionClass = Node.define(['/type/section'], {
        isSection: true
      });
      var sectionClass = Node.define(['/type/text'], {
        isText: true
      });
      
      var sectionView = Node.create({ model: parent });
      var textView = Node.create({ model: child, level: 42 });
      
      expect(sectionView.isSection).toBe(true);
      expect(textView.isText).toBe(true);;
      expect(textView.level).toBe(42);
      
      Node.subclasses = tmp;
    });
  });

});
